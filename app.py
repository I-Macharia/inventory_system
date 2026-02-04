from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy.orm import Session
from datetime import datetime
import json

from app.database import engine, SessionLocal, Base
from app.models import Product, Shop, MasterStock, ConsignmentStock, Invoice, InvoiceItem, ConsignmentSale

# Create tables
Base.metadata.create_all(bind=engine)

app = Flask(__name__)
CORS(app)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ======================== Products Routes ========================
@app.route('/products', methods=['GET'])
def get_products():
    db = SessionLocal()
    products = db.query(Product).all()
    db.close()
    return jsonify([{
        'id': p.id,
        'gpm_code': p.gpm_code,
        'item_code': p.item_code,
        'description': p.description
    } for p in products])

@app.route('/products', methods=['POST'])
def create_product():
    db = SessionLocal()
    data = request.json
    product = Product(
        gpm_code=data.get('gpm_code'),
        item_code=data.get('item_code'),
        description=data.get('description')
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    db.close()
    return jsonify({
        'id': product.id,
        'gpm_code': product.gpm_code,
        'item_code': product.item_code,
        'description': product.description
    }), 201

@app.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    db = SessionLocal()
    product = db.query(Product).filter(Product.id == product_id).first()
    db.close()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify({
        'id': product.id,
        'gpm_code': product.gpm_code,
        'item_code': product.item_code,
        'description': product.description
    })

@app.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    db = SessionLocal()
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        db.close()
        return jsonify({'error': 'Product not found'}), 404
    data = request.json
    product.gpm_code = data.get('gpm_code', product.gpm_code)
    product.item_code = data.get('item_code', product.item_code)
    product.description = data.get('description', product.description)
    db.commit()
    db.close()
    return jsonify({
        'id': product.id,
        'gpm_code': product.gpm_code,
        'item_code': product.item_code,
        'description': product.description
    })

# ======================== Shops Routes ========================
@app.route('/shops', methods=['GET'])
def get_shops():
    db = SessionLocal()
    shops = db.query(Shop).all()
    db.close()
    return jsonify([{
        'id': s.id,
        'name': s.name,
        'type': s.type
    } for s in shops])

@app.route('/shops', methods=['POST'])
def create_shop():
    db = SessionLocal()
    data = request.json
    shop = Shop(
        name=data.get('name'),
        type=data.get('type', 'normal')
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)
    db.close()
    return jsonify({
        'id': shop.id,
        'name': shop.name,
        'type': shop.type
    }), 201

@app.route('/shops/<int:shop_id>', methods=['GET'])
def get_shop(shop_id):
    db = SessionLocal()
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    db.close()
    if not shop:
        return jsonify({'error': 'Shop not found'}), 404
    return jsonify({
        'id': shop.id,
        'name': shop.name,
        'type': shop.type
    })

@app.route('/shops/<int:shop_id>', methods=['PUT'])
def update_shop(shop_id):
    db = SessionLocal()
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        db.close()
        return jsonify({'error': 'Shop not found'}), 404
    data = request.json
    shop.name = data.get('name', shop.name)
    shop.type = data.get('type', shop.type)
    db.commit()
    db.close()
    return jsonify({
        'id': shop.id,
        'name': shop.name,
        'type': shop.type
    })

# ======================== Invoices Routes ========================
@app.route('/invoices', methods=['GET'])
def get_invoices():
    db = SessionLocal()
    invoices = db.query(Invoice).all()
    db.close()
    return jsonify([{
        'id': i.id,
        'invoice_no': i.invoice_no,
        'shop_id': i.shop_id,
        'date': i.date.isoformat() if i.date else None
    } for i in invoices])

@app.route('/invoices', methods=['POST'])
def create_invoice():
    db = SessionLocal()
    data = request.json
    invoice = Invoice(
        invoice_no=data.get('invoice_no'),
        shop_id=data.get('shop_id'),
        date=datetime.fromisoformat(data.get('date')) if data.get('date') else datetime.now()
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    db.close()
    return jsonify({
        'id': invoice.id,
        'invoice_no': invoice.invoice_no,
        'shop_id': invoice.shop_id,
        'date': invoice.date.isoformat() if invoice.date else None
    }), 201

@app.route('/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    db = SessionLocal()
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        db.close()
        return jsonify({'error': 'Invoice not found'}), 404
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).all()
    db.close()
    return jsonify({
        'id': invoice.id,
        'invoice_no': invoice.invoice_no,
        'shop_id': invoice.shop_id,
        'date': invoice.date.isoformat() if invoice.date else None,
        'items': [{
            'id': item.id,
            'product_id': item.product_id,
            'quantity': item.quantity,
            'rate': item.rate
        } for item in items]
    })

# ======================== Stock Movements Routes ========================
@app.route('/stock-movements', methods=['GET'])
def get_stock_movements():
    db = SessionLocal()
    # Placeholder: could be from ConsignmentSale or a dedicated StockMovement table
    movements = db.query(ConsignmentSale).all()
    db.close()
    return jsonify([{
        'id': m.id,
        'shop_id': m.shop_id,
        'product_id': m.product_id,
        'quantity': m.quantity,
        'date': m.date.isoformat() if m.date else None
    } for m in movements])

@app.route('/stock-movements', methods=['POST'])
def create_stock_movement():
    db = SessionLocal()
    data = request.json
    movement = ConsignmentSale(
        shop_id=data.get('shop_id'),
        product_id=data.get('product_id'),
        quantity=data.get('quantity'),
        date=datetime.fromisoformat(data.get('date')) if data.get('date') else datetime.now()
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    db.close()
    return jsonify({
        'id': movement.id,
        'shop_id': movement.shop_id,
        'product_id': movement.product_id,
        'quantity': movement.quantity,
        'date': movement.date.isoformat() if movement.date else None
    }), 201

# ======================== Orders Routes (Placeholder) ========================
@app.route('/orders', methods=['GET'])
def get_orders():
    # Placeholder for orders - adjust based on your actual Order model
    return jsonify([])

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.json
    return jsonify({
        'id': 1,
        'status': 'pending'
    }), 201

@app.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    return jsonify({'error': 'Order not found'}), 404

@app.route('/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    data = request.json
    return jsonify({'id': order_id, 'status': data.get('order_status', 'pending')})

# ======================== Health Check ========================
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=8000)
