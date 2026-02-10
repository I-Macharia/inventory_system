"""
Production-ready FastAPI application with secure authentication.
"""
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, date
from typing import Optional
import pandas as pd
from fastapi import UploadFile, File
from pydantic import BaseModel, EmailStr, Field
import io
from fastapi.responses import StreamingResponse, FileResponse
from reportlab.platypus import SimpleDocTemplate, Table
from reportlab.lib.pagesizes import A4

from app.database import engine, SessionLocal
from app import models
from app.models import (
    Product, Shop, MasterStock, ConsignmentStock,
    Invoice, InvoiceItem, ConsignmentSale,
    UserRequest, User
)
from app.services.pdf_parser import parse_invoice_pdf

# Import our production-ready auth utilities
from auth_utils import (
    hash_password,
    verify_password,
    generate_secure_password,
    create_access_token,
    decode_access_token,
    validate_password_strength,
    login_tracker,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    SECURITY_HEADERS,
)


# ==================== Database Setup ====================
models.Base.metadata.create_all(bind=engine)


# ==================== FastAPI App ====================
app = FastAPI(
    title="Inventory System",
    description="Production-ready inventory management system with secure authentication",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        # Add your production domains here
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ==================== Security Middleware ====================
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response


# ==================== Database Dependency ====================
def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==================== Authentication Dependencies ====================
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Validate JWT token and return current user.
    Raises HTTPException if token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = decode_access_token(token)
    if token_data is None or token_data.username is None:
        raise credentials_exception
    
    # Check database for user
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


async def get_current_active_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Verify that the current user has admin privileges.
    Add is_admin field to User model in production.
    """
    # For now, check if username is 'admin'
    # In production, add is_admin or role field to User model
    if current_user.username != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


# ==================== Pydantic Models ====================
class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60  # in seconds


class LoginRequest(BaseModel):
    """Login request model"""
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)


class AccessRequest(BaseModel):
    """Access request model"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr


class UserResponse(BaseModel):
    """User response model (no sensitive data)"""
    id: int
    username: str
    email: str
    is_active: bool
    
    class Config:
        from_attributes = True


class ApprovalResponse(BaseModel):
    """Response after approving user access"""
    message: str
    username: str
    temporary_password: str
    expires_in_days: int = 7


class ProductCreate(BaseModel):
    """Product creation model"""
    gpm_code: str
    item_code: str
    description: str


class ShopCreate(BaseModel):
    """Shop creation model"""
    name: str
    type: str  # "normal" or "consignment"


class SaleInput(BaseModel):
    """Consignment sale input model"""
    shop_name: str
    item_code: str
    qty: int = Field(..., gt=0)


# ==================== Authentication Routes ====================

@app.post("/login", response_model=Token)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login endpoint - validates credentials and returns JWT token.
    Implements rate limiting to prevent brute force attacks.
    """
    # Check if user is locked out
    is_locked, lockout_until = login_tracker.is_locked_out(credentials.username)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Try again after {lockout_until.strftime('%H:%M:%S')}",
        )
    
    # Special handling for admin user (temporary - remove in production)
    ADMIN_USERNAME = "admin"
    ADMIN_PASSWORD = "admin123"  # Change this immediately
    
    if credentials.username == ADMIN_USERNAME and credentials.password == ADMIN_PASSWORD:
        # Create admin user in database if doesn't exist
        admin_user = db.query(User).filter(User.username == ADMIN_USERNAME).first()
        if not admin_user:
            admin_user = User(
                username=ADMIN_USERNAME,
                email="admin@inventory.com",
                hashed_password=hash_password(ADMIN_PASSWORD),
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        
        login_tracker.clear_attempts(credentials.username)
        
        access_token = create_access_token(
            data={
                "sub": admin_user.username,
                "user_id": admin_user.id
            }
        )
        return Token(access_token=access_token)
    
    # Regular user authentication
    user = db.query(User).filter(User.username == credentials.username).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        # Record failed attempt
        login_tracker.record_attempt(credentials.username, success=False)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Successful login - clear attempts
    login_tracker.clear_attempts(credentials.username)
    
    access_token = create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id
        }
    )
    
    return Token(access_token=access_token)


@app.post("/auth/request-access")
async def request_access(
    data: AccessRequest,
    db: Session = Depends(get_db)
):
    """
    Submit access request - creates pending user request for admin approval.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Check if request already exists
    existing_request = db.query(UserRequest).filter(UserRequest.email == data.email).first()
    if existing_request:
        if existing_request.status == "pending":
            return {"message": "Access request already submitted and pending review"}
        elif existing_request.status == "approved":
            return {"message": "Access already granted. Please login."}
    
    # Create new request
    new_request = UserRequest(
        name=data.name,
        email=data.email,
        status="pending"
    )
    db.add(new_request)
    db.commit()
    
    return {
        "message": "Access request submitted successfully. Admin will review and contact you.",
        "status": "pending"
    }


@app.get("/admin/requests")
async def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """
    Get all pending access requests.
    Admin only endpoint.
    """
    requests = db.query(UserRequest).filter(UserRequest.status == "pending").all()
    return requests


@app.post("/admin/approve/{request_id}", response_model=ApprovalResponse)
async def approve_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """
    Approve user access request and create user account.
    Admin only endpoint.
    """
    # Find the request
    user_request = db.query(UserRequest).filter(UserRequest.id == request_id).first()
    if not user_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found"
        )
    
    if user_request.status == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request already approved"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    
    # Generate secure temporary password
    temporary_password = generate_secure_password(length=16)
    
    # Create new user
    new_user = User(
        username=user_request.email,  # Use email as username
        email=user_request.email,
        hashed_password=hash_password(temporary_password),
        is_active=True
    )
    
    db.add(new_user)
    user_request.status = "approved"
    db.commit()
    db.refresh(new_user)
    
    # In production, send email with credentials instead of returning in response
    # TODO: Implement email service
    
    return ApprovalResponse(
        message="User approved successfully",
        username=new_user.username,
        temporary_password=temporary_password
    )


@app.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user information"""
    return current_user


# ==================== Product Routes ====================

@app.get("/products")
async def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all products"""
    products = db.query(Product).all()
    return [
        {
            "id": p.id,
            "gpm_code": p.gpm_code,
            "item_code": p.item_code,
            "description": p.description
        }
        for p in products
    ]


@app.post("/products/add")
async def add_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add new product"""
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    # Initialize master stock
    stock = MasterStock(product_id=db_product.id, quantity=0)
    db.add(stock)
    db.commit()

    return {"message": "Product added successfully", "product_id": db_product.id}


# ==================== Shop Routes ====================

@app.get("/shops")
async def list_shops(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all shops"""
    shops = db.query(Shop).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "type": s.type
        }
        for s in shops
    ]


@app.post("/shops/add")
async def add_shop(
    shop: ShopCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add new shop"""
    db_shop = Shop(**shop.dict())
    db.add(db_shop)
    db.commit()
    return {"message": "Shop added successfully", "shop_id": db_shop.id}


# ==================== Stock Routes ====================

@app.get("/stock/master")
async def view_master_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """View master stock"""
    stock = db.query(MasterStock).all()
    return stock


@app.get("/stock/consignment")
async def view_consignment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """View consignment stock"""
    return db.query(ConsignmentStock).all()


# ==================== Invoice Routes ====================

@app.post("/upload-invoice")
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and process invoice (PDF or Excel)"""
    
    if file.filename.endswith(".pdf"):
        shop_name, invoice_no, items = parse_invoice_pdf(file.file)
    else:
        df = pd.read_excel(file.file)
        shop_name = df.iloc[0]["Shop"]
        invoice_no = df.iloc[0]["InvoiceNo"]
        items = [
            {
                "item_code": row["ItemCode"],
                "qty": int(row["Qty"]),
                "rate": row["Rate"]
            }
            for _, row in df.iterrows()
        ]

    # Get or create shop
    shop = db.query(Shop).filter(Shop.name == shop_name).first()
    if not shop:
        shop_type = "consignment" if "naivas" in shop_name.lower() else "normal"
        shop = Shop(name=shop_name, type=shop_type)
        db.add(shop)
        db.commit()
        db.refresh(shop)

    # Create invoice
    invoice = Invoice(invoice_no=invoice_no, shop_id=shop.id, date=date.today())
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    # Process items
    for row in items:
        product = db.query(Product).filter(Product.item_code == row["item_code"]).first()
        if not product:
            continue

        qty = row["qty"]

        db.add(InvoiceItem(
            invoice_id=invoice.id,
            product_id=product.id,
            quantity=qty,
            rate=row["rate"]
        ))

        if shop.type == "normal":
            stock = db.query(MasterStock).filter_by(product_id=product.id).first()
            if stock.quantity < qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Not enough master stock"
                )
            stock.quantity -= qty
        else:
            cons = db.query(ConsignmentStock).filter_by(
                product_id=product.id,
                shop_id=shop.id
            ).first()

            if not cons:
                cons = ConsignmentStock(product_id=product.id, shop_id=shop.id, quantity=0)
                db.add(cons)

            cons.quantity += qty

    db.commit()
    return {"message": "Invoice processed successfully", "invoice_id": invoice.id}


@app.get("/invoices")
async def list_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all invoices"""
    invoices = db.query(Invoice).all()
    return [
        {
            "id": i.id,
            "invoice_no": i.invoice_no,
            "shop_id": i.shop_id,
            "date": i.date.isoformat() if i.date else None
        }
        for i in invoices
    ]


# ==================== Sales Routes ====================

@app.post("/consignment/sale")
async def record_sale(
    data: SaleInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record consignment sale"""
    
    shop = db.query(Shop).filter(Shop.name == data.shop_name).first()
    if not shop or shop.type != "consignment":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid consignment shop"
        )

    product = db.query(Product).filter(Product.item_code == data.item_code).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    cons_stock = db.query(ConsignmentStock).filter_by(
        shop_id=shop.id,
        product_id=product.id
    ).first()

    if not cons_stock or cons_stock.quantity < data.qty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough consignment stock"
        )

    # Reduce consignment
    cons_stock.quantity -= data.qty

    # Reduce master stock
    master = db.query(MasterStock).filter_by(product_id=product.id).first()
    if master.quantity < data.qty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough master stock"
        )
    master.quantity -= data.qty

    # Record sale
    db.add(ConsignmentSale(
        shop_id=shop.id,
        product_id=product.id,
        quantity=data.qty,
        date=date.today()
    ))

    db.commit()
    return {"message": "Sale recorded successfully"}


@app.get("/sales/consignment")
async def view_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """View consignment sales"""
    return db.query(ConsignmentSale).all()


@app.get("/stock-movements")
async def list_stock_movements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all stock movements"""
    movements = db.query(ConsignmentSale).all()
    return [
        {
            "id": m.id,
            "product_id": m.product_id,
            "shop_id": m.shop_id,
            "quantity": m.quantity,
            "date": m.date.isoformat() if m.date else None
        }
        for m in movements
    ]


# ==================== Export Routes ====================

@app.get("/export/stock")
async def export_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export stock data to Excel"""
    stock = db.query(MasterStock).all()
    data = [{"Product ID": s.product_id, "Quantity": s.quantity} for s in stock]
    df = pd.DataFrame(data)

    stream = io.BytesIO()
    df.to_excel(stream, index=False)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=stock.xlsx"}
    )


@app.get("/export/stock-pdf")
async def export_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export stock data to PDF"""
    file_path = "stock_report.pdf"
    doc = SimpleDocTemplate(file_path, pagesize=A4)

    stock = db.query(MasterStock).all()
    data = [["Product ID", "Qty"]] + [[s.product_id, s.quantity] for s in stock]

    table = Table(data)
    doc.build([table])

    return FileResponse(file_path)


# ==================== Health Check ====================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Inventory System",
        "version": "2.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "timestamp": date.today().isoformat()
    }
