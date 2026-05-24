import requests
import json
import csv
import os
from urllib.parse import urljoin
import time

# Configuration
BASE_URL = "https://808pickle.com"
PRODUCTS_JSON_URL = f"{BASE_URL}/products.json"
OUTPUT_CSV = "808pickle_shopify_import.csv"
IMAGES_FOLDER = "product_images"

# Create images folder
os.makedirs(IMAGES_FOLDER, exist_ok=True)

def download_image(url, product_handle, image_index):
    """Download product image and return local path"""
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        # Create filename from product handle and index
        ext = url.split('?')[0].split('.')[-1]
        filename = f"{product_handle}_{image_index}.{ext}"
        filepath = os.path.join(IMAGES_FOLDER, filename)
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"  ✓ Downloaded: {filename}")
        return filepath
    except Exception as e:
        print(f"  ✗ Failed to download {url}: {e}")
        return url  # Return URL if download fails

def fetch_products():
    """Fetch all products from 808pickle.com JSON API"""
    print(f"Fetching products from {PRODUCTS_JSON_URL}...")
    response = requests.get(PRODUCTS_JSON_URL, timeout=30)
    response.raise_for_status()
    data = response.json()
    print(f"✓ Found {len(data['products'])} products\n")
    return data['products']

def clean_html(html_text):
    """Remove HTML tags and clean description"""
    import re
    if not html_text:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', ' ', html_text)
    # Remove extra whitespace
    clean = ' '.join(clean.split())
    return clean

def generate_shopify_csv(products):
    """Generate Shopify-compatible CSV"""
    
    # Shopify CSV headers
    headers = [
        'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags',
        'Published', 'Option1 Name', 'Option1 Value', 'Option2 Name',
        'Option2 Value', 'Option3 Name', 'Option3 Value', 'Variant SKU',
        'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
        'Variant Inventory Policy', 'Variant Fulfillment Service',
        'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping',
        'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position',
        'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description',
        'Google Shopping / Google Product Category', 'Google Shopping / Gender',
        'Google Shopping / Age Group', 'Google Shopping / MPN',
        'Google Shopping / Condition', 'Google Shopping / Custom Product',
        'Google Shopping / Custom Label 0', 'Google Shopping / Custom Label 1',
        'Google Shopping / Custom Label 2', 'Google Shopping / Custom Label 3',
        'Google Shopping / Custom Label 4', 'Variant Image', 'Variant Weight Unit',
        'Variant Tax Code', 'Cost per item', 'Status'
    ]
    
    rows = []
    
    for product in products:
        print(f"\nProcessing: {product['title']}")
        
        handle = product['handle']
        title = product['title']
        body_html = product.get('body_html', '')
        vendor = product.get('vendor', 'Honolulu Pickleball Company')
        product_type = product.get('product_type', '')
        tags = ', '.join(product.get('tags', []))
        
        # Download product images
        images = product.get('images', [])
        image_paths = []
        for idx, img in enumerate(images, 1):
            img_url = img.get('src', '')
            if img_url:
                downloaded_path = download_image(img_url, handle, idx)
                image_paths.append(downloaded_path)
        
        # Process variants
        variants = product.get('variants', [])
        options = product.get('options', [])
        
        # Get option names
        option1_name = options[0]['name'] if len(options) > 0 else ''
        option2_name = options[1]['name'] if len(options) > 1 else ''
        option3_name = options[2]['name'] if len(options) > 2 else ''
        
        for variant_idx, variant in enumerate(variants):
            # First row for each variant includes full product data
            is_first_variant = (variant_idx == 0)
            
            row = {
                'Handle': handle if is_first_variant else handle,
                'Title': title if is_first_variant else '',
                'Body (HTML)': body_html if is_first_variant else '',
                'Vendor': vendor if is_first_variant else '',
                'Type': product_type if is_first_variant else '',
                'Tags': tags if is_first_variant else '',
                'Published': 'TRUE',
                'Option1 Name': option1_name,
                'Option1 Value': variant.get('option1', ''),
                'Option2 Name': option2_name,
                'Option2 Value': variant.get('option2', ''),
                'Option3 Name': option3_name,
                'Option3 Value': variant.get('option3', ''),
                'Variant SKU': variant.get('sku', ''),
                'Variant Grams': variant.get('grams', ''),
                'Variant Inventory Tracker': 'shopify',
                'Variant Inventory Qty': '10',  # Default inventory
                'Variant Inventory Policy': 'deny',
                'Variant Fulfillment Service': 'manual',
                'Variant Price': variant.get('price', ''),
                'Variant Compare At Price': variant.get('compare_at_price', ''),
                'Variant Requires Shipping': 'TRUE',
                'Variant Taxable': 'TRUE',
                'Variant Barcode': '',
                'Image Src': '',
                'Image Position': '',
                'Image Alt Text': '',
                'Gift Card': 'FALSE',
                'SEO Title': title,
                'SEO Description': clean_html(body_html)[:160],
                'Google Shopping / Google Product Category': '',
                'Google Shopping / Gender': '',
                'Google Shopping / Age Group': '',
                'Google Shopping / MPN': variant.get('sku', ''),
                'Google Shopping / Condition': 'new',
                'Google Shopping / Custom Product': 'FALSE',
                'Google Shopping / Custom Label 0': product_type,
                'Google Shopping / Custom Label 1': '',
                'Google Shopping / Custom Label 2': '',
                'Google Shopping / Custom Label 3': '',
                'Google Shopping / Custom Label 4': '',
                'Variant Image': '',
                'Variant Weight Unit': 'oz',
                'Variant Tax Code': '',
                'Cost per item': '',
                'Status': 'active' if variant.get('available', True) else 'draft'
            }
            
            rows.append(row)
        
        # Add image rows (only for first variant)
        for idx, img_path in enumerate(image_paths, 1):
            if idx == 1:
                # First image is already included with product data
                rows[len(rows) - len(variants)]['Image Src'] = img_path
                rows[len(rows) - len(variants)]['Image Position'] = str(idx)
                rows[len(rows) - len(variants)]['Image Alt Text'] = title
            else:
                # Additional images get their own rows
                img_row = {h: '' for h in headers}
                img_row['Handle'] = handle
                img_row['Image Src'] = img_path
                img_row['Image Position'] = str(idx)
                img_row['Image Alt Text'] = title
                rows.append(img_row)
    
    # Write CSV
    print(f"\n\nWriting CSV to {OUTPUT_CSV}...")
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"✓ CSV created with {len(rows)} rows")
    print(f"✓ Product images saved to: {IMAGES_FOLDER}/")

def main():
    print("=" * 60)
    print("808PICKLE.COM → SHOPIFY AUTOMATED IMPORT")
    print("=" * 60)
    
    try:
        products = fetch_products()
        generate_shopify_csv(products)
        
        print("\n" + "=" * 60)
        print("✓ EXTRACTION COMPLETE!")
        print("=" * 60)
        print(f"\n📁 Files created:")
        print(f"   • {OUTPUT_CSV}")
        print(f"   • {IMAGES_FOLDER}/ (all product images)")
        print(f"\n📤 Next steps:")
        print(f"   1. Upload CSV: Shopify Admin → Products → Import")
        print(f"   2. Upload images to Shopify or use URLs in CSV")
        print(f"   3. Review and publish products")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
