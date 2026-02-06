from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app import models
from app.models import Product, Shop, MasterStock
from pydantic import BaseModel
import pandas as pd
from fastapi import UploadFile, File
from app.models import Invoice, InvoiceItem, Shop, Product, MasterStock, ConsignmentStock, ConsignmentSale, UserRequest, User
from datetime import date, datetime, timedelta
from app.services.pdf_parser import parse_invoice_pdf
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
import io
from reportlab.platypus import SimpleDocTemplate, Table
from reportlab.lib.pagesizes import A4
from fastapi.responses import FileResponse
from jose import JWTError, jwt
from passlib.context import CryptContext

# ======================== Auth Configuration ========================
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Fake user for now (in production, query from database)
FAKE_USERS = {
    "admin": {
        "username": "admin",
        "password": "admin123"
    }
}

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory System")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password, hashed_password):
    """Verify plain password against hashed password"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validate JWT token and return current user"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return {"username": username}


# ======================== Auth Routes ========================

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None
    
class LoginRequest(BaseModel):
    username: str
    password: str
    
class AccessRequest(BaseModel):
    name: str
    email: str


@app.post("/login", response_model=Token)
async def login(credentials: LoginRequest):
    """Login endpoint - returns JWT token"""
    user = FAKE_USERS.get(credentials.username)
    
    if not user or user["password"] != credentials.password:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": credentials.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/request-access")
def request_access(data: AccessRequest, db: Session = Depends(get_db)):
    existing = db.query(UserRequest).filter_by(email=data.email).first()
    if existing:
        return {"message": "Request already sent"}

    req = UserRequest(name=data.name, email=data.email)
    db.add(req)
    db.commit()
    return {"message": "Request sent"}

@app.get("/admin/requests")
def get_requests(db: Session = Depends(get_db)):
    return db.query(UserRequest).filter_by(status="pending").all()

# @app.post("/login", response_model=Token)
# async def login(form_data: OAuth2PasswordRequestForm = Depends()):
#     """Login endpoint - returns JWT token"""
#     user = FAKE_USERS.get(form_data.username)
    
#     if not user or user["password"] != form_data.password:
#         raise HTTPException(
#             status_code=401,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
    
#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data={"sub": form_data.username}, expires_delta=access_token_expires
#     )
#     return {"access_token": access_token, "token_type": "bearer"}

@app.post("/admin/approve/{request_id}")
def approve_request(request_id: int, db: Session = Depends(get_db)):
    req = db.query(UserRequest).get(request_id)
    if not req:
        return {"error": "Not found"}

    req.status = "approved"

    # create real user
    new_user = User(
        username=req.email,
        hashed_password=get_password_hash("temporary123")
    )
    db.add(new_user)
    db.commit()

    return {"message": "User approved"}


@app.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user
        

@app.get("/")
def home():
    return {"message": "Inventory System Running"}



# ======================== Products Routes ========================

@app.get("/products")
def list_products(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
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

        
class ProductCreate(BaseModel):
    gpm_code: str
    item_code: str
    description: str

@app.post("/products/add")
def add_product(product: ProductCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    stock = MasterStock(product_id=db_product.id, quantity=0)
    db.add(stock)
    db.commit()

    return {"message": "Product added"}


class ShopCreate(BaseModel):
    name: str
    type: str  # "normal" or "consignment"


@app.get("/shops")
def list_shops(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
def add_shop(shop: ShopCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_shop = Shop(**shop.dict())
    db.add(db_shop)
    db.commit()
    return {"message": "Shop added"}


@app.get("/stock/master")
def view_master_stock(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    stock = db.query(MasterStock).all()
    return stock

@app.post("/upload-invoice")
def upload_invoice(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):

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

    shop = db.query(Shop).filter(Shop.name == shop_name).first()
    if not shop:
        shop_type = "consignment" if "naivas" in shop_name.lower() else "normal"
        shop = Shop(name=shop_name, type=shop_type)
        db.add(shop)
        db.commit()
        db.refresh(shop)

    invoice = Invoice(invoice_no=invoice_no, shop_id=shop.id, date=date.today())
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

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
    return {"message": "Invoice processed"}


@app.get("/invoices")
def list_invoices(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
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


@app.get("/stock/consignment")
def view_consignment(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(ConsignmentStock).all()


class SaleInput(BaseModel):
    shop_name: str
    item_code: str
    qty: int
    
@app.post("/consignment/sale")
def record_sale(data: SaleInput, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):

    shop = db.query(Shop).filter(Shop.name == data.shop_name).first()
    if not shop or shop.type != "consignment":
        return {"error": "Invalid consignment shop"}

    product = db.query(Product).filter(Product.item_code == data.item_code).first()
    if not product:
        return {"error": "Product not found"}

    cons_stock = db.query(ConsignmentStock).filter_by(
        shop_id=shop.id,
        product_id=product.id
    ).first()

    if not cons_stock or cons_stock.quantity < data.qty:
        return {"error": "Not enough consignment stock"}

    # Reduce consignment
    cons_stock.quantity -= data.qty

    # Reduce master stock (now officially sold)
    master = db.query(MasterStock).filter_by(product_id=product.id).first()
    master.quantity -= data.qty

    # Record sale
    db.add(ConsignmentSale(
        shop_id=shop.id,
        product_id=product.id,
        quantity=data.qty,
        date=date.today()
    ))

    db.commit()
    return {"message": "Sale recorded"}


@app.get("/sales/consignment")
def view_sales(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(ConsignmentSale).all()


@app.get("/stock-movements")
def list_stock_movements(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Get all stock movements (consignment sales)"""
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


class LogActivity(BaseModel):
    page: str


@app.post("/logs/user-activity")
def log_user_activity(data: LogActivity, current_user: dict = Depends(get_current_user)):
    """Log user activity (page visits)"""
    # In production, you would save this to a logs table
    # For now, just log it to console
    print(f"User {current_user['username']} visited page: {data.page}")
    return {"message": "Activity logged"}


# Templates

templates = Jinja2Templates(directory="templates")

@app.get("/")
def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/stock")
def master_stock_page(request: Request, db: Session = Depends(get_db)):
    stock = db.query(MasterStock).all()
    return templates.TemplateResponse("stock.html", {"request": request, "stock": stock})

# Exports

@app.get("/export/stock")
def export_stock(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    stock = db.query(MasterStock).all()
    data = [{"Product ID": s.product_id, "Quantity": s.quantity} for s in stock]
    df = pd.DataFrame(data)

    stream = io.BytesIO()
    df.to_excel(stream, index=False)
    stream.seek(0)

    return StreamingResponse(stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=stock.xlsx"})
    
@app.get("/export/stock-pdf")
def export_pdf(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    file_path = "stock_report.pdf"
    doc = SimpleDocTemplate(file_path, pagesize=A4)

    stock = db.query(MasterStock).all()
    data = [["Product ID", "Qty"]] + [[s.product_id, s.quantity] for s in stock]

    table = Table(data)
    doc.build([table])

    return FileResponse(file_path)