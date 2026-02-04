from sqlalchemy import Column, Integer, String, ForeignKey, Float, Date
from sqlalchemy.orm import relationship
from .database import Base



class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    gpm_code = Column(String, index=True)
    item_code = Column(String, index=True)
    description = Column(String)


class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    type = Column(String)  # "normal" or "consignment"


class MasterStock(Base):
    __tablename__ = "master_stock"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=0)


class ConsignmentStock(Base):
    __tablename__ = "consignment_stock"

    id = Column(Integer, primary_key=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=0)


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True)
    invoice_no = Column(String, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    date = Column(Date)


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    rate = Column(Float)
    
class ConsignmentSale(Base):
    __tablename__ = "consignment_sales"

    id = Column(Integer, primary_key=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    date = Column(Date)
