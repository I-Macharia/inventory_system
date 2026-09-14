from app import app


def test_stock_import_template_download():
    client = app.test_client()
    response = client.get('/stock/import-template')
    assert response.status_code == 200
    assert response.mimetype == 'text/csv'
    body = response.get_data(as_text=True)
    assert 'item_code' in body
    assert 'gpm_code' in body
    assert 'description' in body
    assert 'quantity' in body
