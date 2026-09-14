import io
import os
from datetime import date, datetime, timedelta
from functools import wraps

import pandas as pd
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from jose import JWTError, jwt
from passlib.context import CryptContext
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table

from app.database import Base, SessionLocal, engine
from app.models import (
    ConsignmentSale,
    ConsignmentStock,
    Invoice,
    InvoiceItem,
    MasterStock,
    Product,
    Shop,
    User,
    UserRequest,
)
from app.services.pdf_parser import parse_invoice_pdf

Base.metadata.create_all(bind=engine)

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"detail": "Missing token"}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if not username:
                raise ValueError("missing user")
        except (JWTError, ValueError):
            return jsonify({"detail": "Could not validate credentials"}), 401

        return fn(current_user={"username": username}, *args, **kwargs)

    return wrapper


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Inventory System Running"})


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"detail": "Username and password are required"}), 400

    db = SessionLocal()
    user = db.query(User).filter((User.username == username) | (User.email == username)).first()
    db.close()

    if not user or not verify_password(password, user.hashed_password):
        return jsonify({"detail": "Incorrect username or password"}), 401

    token = create_access_token({"sub": user.username})
    return jsonify({"access_token": token, "token_type": "bearer"})


@app.route("/me", methods=["GET"])
@token_required
def get_me(current_user):
    return jsonify(current_user)


@app.route("/auth/request-access", methods=["POST"])
def request_access():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()

    if not name or not email:
        return jsonify({"detail": "Name and email are required"}), 400

    db = SessionLocal()
    existing = db.query(UserRequest).filter_by(email=email).first()
    if existing:
        db.close()
        return jsonify({"message": "Request already sent"})

    req = UserRequest(name=name, email=email)
    db.add(req)
    db.commit()
    db.close()
    return jsonify({"message": "Request sent"})


@app.route("/admin/requests", methods=["GET"])
def get_requests():
    db = SessionLocal()
    requests = db.query(UserRequest).filter_by(status="pending").all()
    db.close()
    return jsonify([
        {
            "id": req.id,
            "name": req.name,
            "email": req.email,
            "status": req.status,
        }
        for req in requests
    ])


@app.route("/admin/approve/<int:request_id>", methods=["POST"])
def approve_request(request_id):
    db = SessionLocal()
    req = db.query(UserRequest).filter_by(id=request_id).first()
    if not req:
        db.close()
        return jsonify({"error": "Not found"}), 404

    req.status = "approved"
    new_user = User(
        email=req.email,
        username=req.email,
        hashed_password=get_password_hash("temporary123"),
    )
    db.add(new_user)
    db.commit()
    db.close()
    return jsonify({"message": "User approved"})


@app.route("/products", methods=["GET"])
@token_required
def get_products(current_user):
    db = SessionLocal()
    products = db.query(Product).all()
    db.close()
    return jsonify([
        {
            "id": p.id,
            "gpm_code": p.gpm_code,
            "item_code": p.item_code,
            "description": p.description,
        }
        for p in products
    ])


@app.route("/products", methods=["POST"])
@token_required
def create_product(current_user):
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        product = Product(
            gpm_code=data.get("gpm_code"),
            item_code=data.get("item_code"),
            description=data.get("description"),
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        stock = MasterStock(product_id=product.id, quantity=0)
        db.add(stock)
        db.commit()

        payload = {
            "id": product.id,
            "gpm_code": product.gpm_code,
            "item_code": product.item_code,
            "description": product.description,
        }
    finally:
        db.close()

    return jsonify(payload), 201


@app.route("/products/<int:product_id>", methods=["GET"])
@token_required
def get_product(current_user, product_id):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return jsonify({"error": "Product not found"}), 404
        payload = {
            "id": product.id,
            "gpm_code": product.gpm_code,
            "item_code": product.item_code,
            "description": product.description,
        }
    finally:
        db.close()
    return jsonify(payload)


@app.route("/products/<int:product_id>", methods=["PUT"])
@token_required
def update_product(current_user, product_id):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return jsonify({"error": "Product not found"}), 404

        data = request.get_json(silent=True) or {}
        product.gpm_code = data.get("gpm_code", product.gpm_code)
        product.item_code = data.get("item_code", product.item_code)
        product.description = data.get("description", product.description)
        db.commit()
        payload = {
            "id": product.id,
            "gpm_code": product.gpm_code,
            "item_code": product.item_code,
            "description": product.description,
        }
        return jsonify(payload)
    finally:
        db.close()


@app.route("/products/<int:product_id>", methods=["DELETE"])
@token_required
def delete_product(current_user, product_id):
    db = SessionLocal()
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        db.close()
        return jsonify({"error": "Product not found"}), 404
    db.delete(product)
    db.commit()
    db.close()
    return jsonify({"message": "Product deleted"})


@app.route("/shops", methods=["GET"])
@token_required
def get_shops(current_user):
    db = SessionLocal()
    shops = db.query(Shop).all()
    db.close()
    return jsonify([
        {"id": s.id, "name": s.name, "type": s.type}
        for s in shops
    ])


@app.route("/shops", methods=["POST"])
@token_required
def create_shop(current_user):
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        shop = Shop(name=data.get("name"), type=data.get("type", "normal"))
        db.add(shop)
        db.commit()
        db.refresh(shop)
        payload = {"id": shop.id, "name": shop.name, "type": shop.type}
    finally:
        db.close()
    return jsonify(payload), 201


@app.route("/shops/<int:shop_id>", methods=["GET"])
@token_required
def get_shop(current_user, shop_id):
    db = SessionLocal()
    try:
        shop = db.query(Shop).filter(Shop.id == shop_id).first()
        if not shop:
            return jsonify({"error": "Shop not found"}), 404
        payload = {"id": shop.id, "name": shop.name, "type": shop.type}
    finally:
        db.close()
    return jsonify(payload)


@app.route("/shops/<int:shop_id>", methods=["PUT"])
@token_required
def update_shop(current_user, shop_id):
    db = SessionLocal()
    try:
        shop = db.query(Shop).filter(Shop.id == shop_id).first()
        if not shop:
            return jsonify({"error": "Shop not found"}), 404
        data = request.get_json(silent=True) or {}
        shop.name = data.get("name", shop.name)
        shop.type = data.get("type", shop.type)
        db.commit()
        payload = {"id": shop.id, "name": shop.name, "type": shop.type}
        return jsonify(payload)
    finally:
        db.close()


@app.route("/stock/master", methods=["GET"])
@token_required
def view_master_stock(current_user):
    db = SessionLocal()
    stock = db.query(MasterStock).all()
    db.close()
    return jsonify([
        {"id": s.id, "product_id": s.product_id, "quantity": s.quantity}
        for s in stock
    ])


def _coerce_number(value):
    if value is None or value == "":
        return 0
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        cleaned = value.strip().replace(",", "").replace(" ", "")
        if cleaned in {"", "-", "--"}:
            return 0
        try:
            return int(float(cleaned))
        except ValueError:
            return 0
    return 0


@app.route("/stock/import-template", methods=["GET"])
@token_required
def download_stock_import_template(current_user):
    template = pd.DataFrame([
        {
            "item_code": "ITEM-001",
            "gpm_code": "GPM-001",
            "description": "Example product description",
            "quantity": 10,
        },
        {
            "item_code": "ITEM-002",
            "gpm_code": "GPM-002",
            "description": "Another example product",
            "quantity": 25,
        },
    ])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        template.to_excel(writer, index=False, sheet_name="Stock Import")
    output.seek(0)

    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="stock_import_template.xlsx",
    )


@app.route("/stock/import", methods=["POST"])
@token_required
def import_stock_excel(current_user):
    file = request.files.get("file")
    if not file:
        return jsonify({"detail": "No file uploaded"}), 400

    filename = (file.filename or "").lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".csv")):
        return jsonify({"detail": "Unsupported file type. Please upload Excel or CSV."}), 400

    try:
        df = pd.read_excel(file)
    except Exception:
        try:
            file.stream.seek(0)
            df = pd.read_csv(file)
        except Exception:
            return jsonify({"detail": "Unable to read uploaded file. Please check the format."}), 400

    if df.empty:
        return jsonify({"detail": "Uploaded file is empty"}), 400

    normalized = df.rename(columns=lambda col: str(col).strip().lower().replace(" ", "_").replace("-", "_"))
    expected_aliases = {
        "item_code": ["item_code", "itemcode", "code", "sku"],
        "gpm_code": ["gpm_code", "gpm", "gpmcode"],
        "description": ["description", "item_description", "product_name", "name"],
        "quantity": ["quantity", "qty", "stock", "stock_on_hand", "on_hand", "available_qty"],
    }

    def resolve_column(names):
        for name in names:
            for col in normalized.columns:
                if str(col).strip().lower() == name:
                    return col
        for col in normalized.columns:
            normalized_key = str(col).strip().lower().replace(" ", "_").replace("-", "_")
            if normalized_key in names:
                return col
        return None

    item_col = resolve_column(expected_aliases["item_code"])
    gpm_col = resolve_column(expected_aliases["gpm_code"])
    desc_col = resolve_column(expected_aliases["description"])
    qty_col = resolve_column(expected_aliases["quantity"])

    if not item_col and not gpm_col and not desc_col:
        return jsonify({"detail": "The file does not contain recognizable product columns. Expected item_code, gpm_code, description, and quantity."}), 400

    created = 0
    updated = 0
    skipped = 0
    db = SessionLocal()

    try:
        for _, row in normalized.iterrows():
            item_code = str(row[item_col]).strip() if item_col and row.get(item_col) is not None and str(row[item_col]).strip() else ""
            gpm_code = str(row[gpm_col]).strip() if gpm_col and row.get(gpm_col) is not None and str(row[gpm_col]).strip() else ""
            description = str(row[desc_col]).strip() if desc_col and row.get(desc_col) is not None and str(row[desc_col]).strip() else (item_code or gpm_code or "")
            qty = _coerce_number(row[qty_col]) if qty_col and row.get(qty_col) is not None else 0

            if not item_code and not gpm_code and not description:
                skipped += 1
                continue

            product = None
            if item_code:
                product = db.query(Product).filter(Product.item_code == item_code).first()
            if not product and gpm_code:
                product = db.query(Product).filter(Product.gpm_code == gpm_code).first()
            if not product and description:
                product = db.query(Product).filter(Product.description == description).first()

            if not product:
                product = Product(
                    gpm_code=gpm_code or None,
                    item_code=item_code or f"AUTO-{created + updated + 1}",
                    description=description,
                )
                db.add(product)
                db.commit()
                db.refresh(product)
                created += 1
            else:
                if gpm_code and not product.gpm_code:
                    product.gpm_code = gpm_code
                if item_code and not product.item_code:
                    product.item_code = item_code
                if description and not product.description:
                    product.description = description
                updated += 1

            stock = db.query(MasterStock).filter_by(product_id=product.id).first()
            if not stock:
                stock = MasterStock(product_id=product.id, quantity=0)
                db.add(stock)
            stock.quantity = qty
            db.commit()
    finally:
        db.close()

    return jsonify({
        "message": "Stock import completed",
        "rows_processed": int(len(normalized.index)),
        "created": created,
        "updated": updated,
        "skipped": skipped,
    })


@app.route("/upload-invoice", methods=["POST"])
@token_required
def upload_invoice(current_user):
    file = request.files.get("file")
    if not file:
        return jsonify({"detail": "No file uploaded"}), 400

    if file.filename.endswith(".pdf"):
        shop_name, invoice_no, items = parse_invoice_pdf(file.stream)
    else:
        df = pd.read_excel(file)
        if df.empty:
            return jsonify({"detail": "Uploaded file is empty"}), 400
        shop_name = str(df.iloc[0].get("Shop", "")).strip()
        invoice_no = str(df.iloc[0].get("InvoiceNo", "")).strip()
        items = [{
            "item_code": str(row.get("ItemCode", "")).strip(),
            "qty": int(row.get("Qty", 0)),
            "rate": float(row.get("Rate", 0)),
        } for _, row in df.iterrows()]

    db = SessionLocal()
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
        qty = int(row["qty"])
        db.add(InvoiceItem(invoice_id=invoice.id, product_id=product.id, quantity=qty, rate=row["rate"]))

        if shop.type == "normal":
            stock = db.query(MasterStock).filter_by(product_id=product.id).first()
            if not stock:
                stock = MasterStock(product_id=product.id, quantity=0)
                db.add(stock)
            stock.quantity -= qty
        else:
            cons = db.query(ConsignmentStock).filter_by(product_id=product.id, shop_id=shop.id).first()
            if not cons:
                cons = ConsignmentStock(product_id=product.id, shop_id=shop.id, quantity=0)
                db.add(cons)
            cons.quantity += qty

    db.commit()
    db.close()
    return jsonify({"message": "Invoice processed"})


@app.route("/invoices", methods=["GET"])
@token_required
def list_invoices(current_user):
    db = SessionLocal()
    invoices = db.query(Invoice).all()
    db.close()
    return jsonify([
        {
            "id": i.id,
            "invoice_no": i.invoice_no,
            "shop_id": i.shop_id,
            "date": i.date.isoformat() if i.date else None,
        }
        for i in invoices
    ])


@app.route("/stock/consignment", methods=["GET"])
@token_required
def view_consignment(current_user):
    db = SessionLocal()
    stocks = db.query(ConsignmentStock).all()
    db.close()
    return jsonify([
        {"id": s.id, "shop_id": s.shop_id, "product_id": s.product_id, "quantity": s.quantity}
        for s in stocks
    ])


@app.route("/consignment/sale", methods=["POST"])
@token_required
def record_sale(current_user):
    data = request.get_json(silent=True) or {}
    shop_name = (data.get("shop_name") or "").strip()
    item_code = (data.get("item_code") or "").strip()
    qty = int(data.get("qty", 0))

    db = SessionLocal()
    shop = db.query(Shop).filter(Shop.name == shop_name).first()
    if not shop or shop.type != "consignment":
        db.close()
        return jsonify({"error": "Invalid consignment shop"}), 400

    product = db.query(Product).filter(Product.item_code == item_code).first()
    if not product:
        db.close()
        return jsonify({"error": "Product not found"}), 404

    cons_stock = db.query(ConsignmentStock).filter_by(shop_id=shop.id, product_id=product.id).first()
    if not cons_stock or cons_stock.quantity < qty:
        db.close()
        return jsonify({"error": "Not enough consignment stock"}), 400

    cons_stock.quantity -= qty
    master = db.query(MasterStock).filter_by(product_id=product.id).first()
    if master:
        master.quantity -= qty

    db.add(ConsignmentSale(shop_id=shop.id, product_id=product.id, quantity=qty, date=date.today()))
    db.commit()
    db.close()
    return jsonify({"message": "Sale recorded"})


@app.route("/sales/consignment", methods=["GET"])
@token_required
def view_sales(current_user):
    db = SessionLocal()
    sales = db.query(ConsignmentSale).all()
    db.close()
    return jsonify([
        {"id": s.id, "shop_id": s.shop_id, "product_id": s.product_id, "quantity": s.quantity, "date": s.date.isoformat() if s.date else None}
        for s in sales
    ])


@app.route("/stock-movements", methods=["GET"])
@token_required
def list_stock_movements(current_user):
    db = SessionLocal()
    motions = db.query(ConsignmentSale).all()
    db.close()
    return jsonify([
        {
            "id": m.id,
            "product_id": m.product_id,
            "shop_id": m.shop_id,
            "quantity": m.quantity,
            "date": m.date.isoformat() if m.date else None,
        }
        for m in motions
    ])


@app.route("/logs/user-activity", methods=["POST"])
@token_required
def log_user_activity(current_user):
    data = request.get_json(silent=True) or {}
    page = data.get("page", "unknown")
    print(f"User {current_user['username']} visited page: {page}")
    return jsonify({"message": "Activity logged"})


@app.route("/export/stock", methods=["GET"])
@token_required
def export_stock(current_user):
    db = SessionLocal()
    stock = db.query(MasterStock).all()
    data = [{"Product ID": s.product_id, "Quantity": s.quantity} for s in stock]
    db.close()

    stream = io.BytesIO()
    pd.DataFrame(data).to_excel(stream, index=False)
    stream.seek(0)
    return app.response_class(stream.getvalue(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@app.route("/export/stock-pdf", methods=["GET"])
@token_required
def export_pdf(current_user):
    file_path = "stock_report.pdf"
    doc = SimpleDocTemplate(file_path, pagesize=A4)

    db = SessionLocal()
    stock = db.query(MasterStock).all()
    db.close()
    data = [["Product ID", "Qty"]] + [[s.product_id, s.quantity] for s in stock]
    table = Table(data)
    doc.build([table])
    return app.send_static_file(file_path)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
