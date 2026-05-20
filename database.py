import os
import re
from contextlib import contextmanager
from datetime import datetime
from hashlib import md5
from pathlib import Path
from urllib.parse import quote, urlparse, urlunparse

BASE_DIR = Path(__file__).resolve().parent

from psycopg import OperationalError, connect, errors, sql
from psycopg.rows import dict_row
from psycopg.types.json import Json
from werkzeug.security import check_password_hash, generate_password_hash

STORE_SLUG = "merkayohan"

DEFAULT_ADMIN = {
    "username": "admin",
    "password": "admin123",
    "first_name": "Admin",
    "last_name": "MercApp",
    "phone": "3000000000",
    "address": "Panel principal",
    "is_admin": True,
}

DEFAULT_STORE = {
    "slug": STORE_SLUG,
    "name": "AutoServicio MerkaYohan",
    "image": "img/merkayohan.jpg",
    "description": "Compra productos basicos desde casa.",
    "route": "tienda",
}

DEFAULT_CATEGORIES = [
    {"id": "inicio", "label": "Inicio"},
    {"id": "grano", "label": "Grano"},
    {"id": "aseo", "label": "Aseo"},
    {"id": "bebidas", "label": "Bebidas"},
    {"id": "ofertas", "label": "Ofertas"},
]

DEFAULT_PRODUCTS = [
    {"name": "Arroz Diana", "price": 3500, "image": "img/arroz.jpg", "category_id": "grano", "offer": False, "description": "Arroz de alta calidad para tu cocina diaria.", "stock": 50},
    {"name": "Leche Alpina", "price": 4200, "image": "img/leche.jpg", "category_id": "bebidas", "offer": False, "description": "Leche entera fresca lista para el desayuno.", "stock": 30},
    {"name": "Huevos x30", "price": 15000, "image": "img/huevos.jpg", "category_id": "grano", "offer": True, "description": "Cubeta de 30 huevos para toda la familia.", "stock": 20},
    {"name": "Aceite", "price": 9000, "image": "img/aceite.jpg", "category_id": "grano", "offer": True, "description": "Aceite vegetal de 1 litro.", "stock": 25},
    {"name": "Azucar", "price": 2800, "image": "img/azucar.jpg", "category_id": "grano", "offer": False, "description": "Azucar refinada ideal para bebidas y postres.", "stock": 40},
    {"name": "Cafe", "price": 8500, "image": "img/cafe.jpg", "category_id": "bebidas", "offer": False, "description": "Cafe molido con aroma intenso.", "stock": 35},
    {"name": "Gaseosa", "price": 5000, "image": "img/gaseosa.jpg", "category_id": "bebidas", "offer": True, "description": "Gaseosa familiar para compartir.", "stock": 45},
    {"name": "Jabon", "price": 3200, "image": "img/jabon.jpg", "category_id": "aseo", "offer": True, "description": "Jabon de tocador para el cuidado diario.", "stock": 60},
    {"name": "Pan", "price": 2000, "image": "img/pan.jpg", "category_id": "grano", "offer": False, "description": "Pan suave para tus desayunos y onces.", "stock": 15},
    {"name": "Sal", "price": 1500, "image": "img/sal.jpg", "category_id": "grano", "offer": False, "description": "Sal de cocina para todo tipo de recetas.", "stock": 55},
]

CHATBOT_STOP_WORDS = {
    "que",
    "quiero",
    "para",
    "tienen",
    "producto",
    "productos",
    "buscar",
    "precio",
    "costo",
    "cuanto",
    "cuantas",
    "hay",
    "de",
    "del",
    "con",
    "una",
    "uno",
    "hacer",
    "pedido",
    "domicilio",
    "envio",
    "entrega",
    "stock",
    "disponible",
    "cantidad",
    "unidades",
    "favor",
    "me",
    "puedes",
    "necesito",
    "busca",
    "buscame",
    "muestrame",
    "muéstrame",
    "ver",
}

CHATBOT_CONFIRM_WORDS = {
    "si",
    "sí",
    "claro",
    "dale",
    "hazlo",
    "hágalo",
    "hagalo",
    "confirmo",
}

OFF_TOPIC_KEYWORDS = (
    "futbol",
    "partido",
    "musica",
    "pelicula",
    "serie",
    "novia",
    "novio",
    "politica",
    "presidente",
    "trabajo",
    "universidad",
    "colegio",
    "clima",
    "lluvia",
    "sol",
    "juego",
    "videojuego",
    "amor",
    "salud",
    "religion",
)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    route TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    image TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    offer BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NOT NULL DEFAULT '',
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    store_id INTEGER NOT NULL REFERENCES stores(id),
    delivery_type TEXT NOT NULL CHECK (delivery_type IN ('pickup', 'delivery')),
    source TEXT NOT NULL DEFAULT 'storefront',
    status TEXT NOT NULL DEFAULT 'pending',
    total INTEGER NOT NULL CHECK (total >= 0),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name_snapshot TEXT NOT NULL,
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('sale', 'investment')),
    amount INTEGER NOT NULL CHECK (amount >= 0),
    description TEXT NOT NULL,
    order_id BIGINT REFERENCES orders(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


class DatabaseConfigError(RuntimeError):
    pass


def load_local_env():
    env_path = BASE_DIR / ".env"

    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


def format_price(value):
    return f"${int(value):,}".replace(",", ".")


def normalize_text(value):
    return (value or "").lower().strip()


def extract_meaningful_terms(message):
    normalized = normalize_text(message)
    return [
        word
        for word in normalized.replace("?", " ").replace(",", " ").replace(".", " ").split()
        if len(word) >= 2 and word not in CHATBOT_STOP_WORDS
    ]


def build_database_url():
    database_url = os.getenv("DATABASE_URL", "").strip()

    if database_url:
        return database_url

    password = os.getenv("POSTGRES_PASSWORD", "").strip()

    if not password:
        return None

    user = os.getenv("POSTGRES_USER", "postgres").strip() or "postgres"
    host = os.getenv("POSTGRES_HOST", "localhost").strip() or "localhost"
    port = os.getenv("POSTGRES_PORT", "5432").strip() or "5432"
    database = os.getenv("POSTGRES_DB", "mercaapp").strip() or "mercaapp"

    return f"postgresql://{quote(user)}:{quote(password)}@{host}:{port}/{database}"


def derive_admin_url(database_url):
    parsed = urlparse(database_url)

    if not parsed.scheme or not parsed.hostname:
        return database_url

    admin_path = "/postgres"
    return urlunparse((parsed.scheme, parsed.netloc, admin_path, "", "", ""))


def get_database_name(database_url):
    parsed = urlparse(database_url)
    return parsed.path.lstrip("/") or "mercaapp"


@contextmanager
def get_connection(autocommit=False):
    database_url = build_database_url()

    if not database_url:
        raise DatabaseConfigError(
            "No se encontro configuracion de PostgreSQL. Define DATABASE_URL o POSTGRES_PASSWORD en .env."
        )

    connection = connect(database_url, row_factory=dict_row, autocommit=autocommit)

    try:
        yield connection
    finally:
        connection.close()


def ensure_database_exists():
    database_url = build_database_url()

    if not database_url:
        raise DatabaseConfigError(
            "No se encontro configuracion de PostgreSQL. Define DATABASE_URL o POSTGRES_PASSWORD en .env."
        )

    try:
        with get_connection():
            return
    except OperationalError as error:
        error_text = str(error).lower()
        if "does not exist" not in error_text and "no existe la base de datos" not in error_text:
            raise

    database_name = get_database_name(database_url)
    admin_url = derive_admin_url(database_url)

    connection = connect(admin_url, row_factory=dict_row, autocommit=True)

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                sql.SQL("SELECT 1 FROM pg_database WHERE datname = %s"),
                [database_name],
            )
            exists = cursor.fetchone()

            if not exists:
                try:
                    cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
                except errors.DuplicateDatabase:
                    pass
    finally:
        connection.close()


def initialize_database():
    load_local_env()
    ensure_database_exists()

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(SCHEMA_SQL)
            cursor.execute(
                """
                ALTER TABLE chat_messages
                ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb
                """
            )
            cursor.execute(
                """
                ALTER TABLE products
                ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
                """
            )
            cursor.execute(
                """
                ALTER TABLE orders
                ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'storefront'
                """
            )

        connection.commit()

    seed_reference_data()


def seed_reference_data():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO stores (slug, name, image, description, route)
                VALUES (%(slug)s, %(name)s, %(image)s, %(description)s, %(route)s)
                ON CONFLICT (slug) DO UPDATE
                SET name = EXCLUDED.name,
                    image = EXCLUDED.image,
                    description = EXCLUDED.description,
                    route = EXCLUDED.route
                RETURNING id
                """,
                DEFAULT_STORE,
            )
            store_id = cursor.fetchone()["id"]

            for category in DEFAULT_CATEGORIES:
                cursor.execute(
                    """
                    INSERT INTO categories (id, label)
                    VALUES (%(id)s, %(label)s)
                    ON CONFLICT (id) DO UPDATE
                    SET label = EXCLUDED.label
                    """,
                    category,
                )

            cursor.execute(
                """
                INSERT INTO users (username, password_hash, first_name, last_name, phone, address, is_admin)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (username) DO UPDATE
                SET password_hash = EXCLUDED.password_hash,
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    phone = EXCLUDED.phone,
                    address = EXCLUDED.address,
                    is_admin = EXCLUDED.is_admin
                """,
                [
                    DEFAULT_ADMIN["username"],
                    generate_password_hash(DEFAULT_ADMIN["password"]),
                    DEFAULT_ADMIN["first_name"],
                    DEFAULT_ADMIN["last_name"],
                    DEFAULT_ADMIN["phone"],
                    DEFAULT_ADMIN["address"],
                    DEFAULT_ADMIN["is_admin"],
                ],
            )

            cursor.execute(
                "SELECT COUNT(*) AS total FROM products WHERE store_id = %s AND is_active = TRUE",
                [store_id],
            )
            total_products = cursor.fetchone()["total"]

            if total_products == 0:
                for product in DEFAULT_PRODUCTS:
                    cursor.execute(
                        """
                        INSERT INTO products (store_id, name, price, image, category_id, offer, description, stock, is_active)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                        """,
                        [
                            store_id,
                            product["name"],
                            product["price"],
                            product["image"],
                            product["category_id"],
                            product["offer"],
                            product["description"],
                            product["stock"],
                        ],
                    )

        connection.commit()


def map_user(row):
    if not row:
        return None

    row["full_name"] = f"{row['first_name']} {row['last_name']}".strip()
    row["email"] = f"{row['username']}@mercaapp.com"
    return row


def map_store(row):
    return {
        "id": str(row["id"]),
        "slug": row["slug"],
        "nombre": row["name"],
        "imagen": row["image"],
        "descripcion": row["description"],
        "ruta": row["route"],
    }


def map_category(row):
    return {
        "id": row["id"],
        "label": row["label"],
    }


def map_product(row):
    return {
        "id": str(row["id"]),
        "nombre": row["name"],
        "precio": int(row["price"]),
        "precio_mostrado": format_price(row["price"]),
        "imagen": row["image"],
        "categoria": row["category_id"],
        "oferta": bool(row["offer"]),
        "descripcion": row["description"],
        "stock": int(row["stock"]),
    }


def map_transaction(row):
    return {
        "id": str(row["id"]),
        "type": row["type"],
        "amount": int(row["amount"]),
        "description": row["description"],
        "date": row["created_at"].strftime("%d/%m/%Y %H:%M"),
    }


def list_stores():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, slug, name, image, description, route FROM stores ORDER BY id")
            return [map_store(row) for row in cursor.fetchall()]


def get_store_by_slug(slug=STORE_SLUG):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, slug, name, image, description, route FROM stores WHERE slug = %s",
                [slug],
            )
            row = cursor.fetchone()
            return map_store(row) if row else None


def get_store_id(slug=STORE_SLUG):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM stores WHERE slug = %s", [slug])
            row = cursor.fetchone()
            return row["id"] if row else None


def list_categories():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, label FROM categories ORDER BY label")
            categories = [map_category(row) for row in cursor.fetchall()]

    ordered = []
    for category in DEFAULT_CATEGORIES:
        current = next((item for item in categories if item["id"] == category["id"]), None)
        if current:
            ordered.append(current)

    return ordered


def get_user_by_username(username):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, username, password_hash, first_name, last_name, phone, address, is_admin, created_at
                FROM users
                WHERE username = %s
                """,
                [username],
            )
            row = cursor.fetchone()
            return map_user(row) if row else None


def get_user_by_id(user_id):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, username, password_hash, first_name, last_name, phone, address, is_admin, created_at
                FROM users
                WHERE id = %s
                """,
                [user_id],
            )
            row = cursor.fetchone()
            return map_user(row) if row else None


def authenticate_user(username, password):
    user = get_user_by_username(username)

    if not user:
        return None

    if not check_password_hash(user["password_hash"], password):
        return None

    return user


def create_user(first_name, last_name, username, phone, address, password, is_admin=False):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (username, password_hash, first_name, last_name, phone, address, is_admin)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, username, password_hash, first_name, last_name, phone, address, is_admin, created_at
                """,
                [
                    username,
                    generate_password_hash(password),
                    first_name,
                    last_name,
                    phone,
                    address,
                    is_admin,
                ],
            )
            row = cursor.fetchone()
        connection.commit()

    return map_user(row)


def list_products(store_slug=STORE_SLUG):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT p.id, p.name, p.price, p.image, p.category_id, p.offer, p.description, p.stock
                FROM products p
                INNER JOIN stores s ON s.id = p.store_id
                WHERE s.slug = %s AND p.is_active = TRUE
                ORDER BY p.id
                """,
                [store_slug],
            )
            return [map_product(row) for row in cursor.fetchall()]


def get_product(product_id):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, price, image, category_id, offer, description, stock
                FROM products
                WHERE id = %s AND is_active = TRUE
                """,
                [product_id],
            )
            row = cursor.fetchone()
            return map_product(row) if row else None


def build_product_from_form(form_data, product_id=None):
    price = max(int(form_data.get("precio", "0") or 0), 0)
    stock = max(int(form_data.get("stock", "0") or 0), 0)

    return {
        "id": product_id,
        "name": form_data.get("nombre", "").strip(),
        "price": price,
        "image": form_data.get("imagen", "").strip(),
        "category_id": form_data.get("categoria", "grano").strip() or "grano",
        "offer": form_data.get("oferta") == "on",
        "description": form_data.get("descripcion", "").strip(),
        "stock": stock,
    }


def save_product(form_data, product_id=None, store_slug=STORE_SLUG):
    product = build_product_from_form(form_data, product_id)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM stores WHERE slug = %s", [store_slug])
            store_row = cursor.fetchone()

            if not store_row:
                raise ValueError("La tienda no existe.")

            store_id = store_row["id"]

            if product_id:
                cursor.execute(
                    """
                    UPDATE products
                    SET name = %s,
                        price = %s,
                        image = %s,
                        category_id = %s,
                        offer = %s,
                        description = %s,
                        stock = %s,
                        is_active = TRUE
                    WHERE id = %s
                    RETURNING id, name, price, image, category_id, offer, description, stock
                    """,
                    [
                        product["name"],
                        product["price"],
                        product["image"],
                        product["category_id"],
                        product["offer"],
                        product["description"],
                        product["stock"],
                        product_id,
                    ],
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO products (store_id, name, price, image, category_id, offer, description, stock, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                    RETURNING id, name, price, image, category_id, offer, description, stock
                    """,
                    [
                        store_id,
                        product["name"],
                        product["price"],
                        product["image"],
                        product["category_id"],
                        product["offer"],
                        product["description"],
                        product["stock"],
                    ],
                )

            row = cursor.fetchone()

        connection.commit()

    return map_product(row) if row else None


def delete_product(product_id):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE products
                SET is_active = FALSE
                WHERE id = %s
                """,
                [product_id],
            )
        connection.commit()


def restore_default_products(store_slug=STORE_SLUG):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM stores WHERE slug = %s", [store_slug])
            store_row = cursor.fetchone()

            if not store_row:
                raise ValueError("La tienda no existe.")

            store_id = store_row["id"]
            cursor.execute(
                """
                UPDATE products
                SET is_active = FALSE
                WHERE store_id = %s AND is_active = TRUE
                """,
                [store_id],
            )

            for product in DEFAULT_PRODUCTS:
                cursor.execute(
                    """
                    SELECT id
                    FROM products
                    WHERE store_id = %s AND name = %s
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    [store_id, product["name"]],
                )
                existing_row = cursor.fetchone()

                if existing_row:
                    cursor.execute(
                        """
                        UPDATE products
                        SET price = %s,
                            image = %s,
                            category_id = %s,
                            offer = %s,
                            description = %s,
                            stock = %s,
                            is_active = TRUE
                        WHERE id = %s
                        """,
                        [
                            product["price"],
                            product["image"],
                            product["category_id"],
                            product["offer"],
                            product["description"],
                            product["stock"],
                            existing_row["id"],
                        ],
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO products (store_id, name, price, image, category_id, offer, description, stock, is_active)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                        """,
                        [
                            store_id,
                            product["name"],
                            product["price"],
                            product["image"],
                            product["category_id"],
                            product["offer"],
                            product["description"],
                            product["stock"],
                        ],
                    )

        connection.commit()


def list_transactions():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, type, amount, description, created_at
                FROM transactions
                ORDER BY created_at DESC, id DESC
                """
            )
            return [map_transaction(row) for row in cursor.fetchall()]


def get_transaction_summary():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN type = 'sale' THEN amount END), 0) AS total_ventas,
                    COALESCE(SUM(CASE WHEN type = 'investment' THEN amount END), 0) AS total_inversiones
                FROM transactions
                """
            )
            row = cursor.fetchone()

    total_ventas = int(row["total_ventas"])
    total_inversiones = int(row["total_inversiones"])

    return {
        "total_ventas": total_ventas,
        "total_inversiones": total_inversiones,
        "ganancias": total_ventas - total_inversiones,
    }


def create_transaction(transaction_type, amount, description, order_id=None):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO transactions (type, amount, description, order_id)
                VALUES (%s, %s, %s, %s)
                RETURNING id, type, amount, description, created_at
                """,
                [transaction_type, amount, description, order_id],
            )
            row = cursor.fetchone()

        connection.commit()

    return map_transaction(row)


def create_order(user_id, items, delivery_type="pickup", notes="", store_slug=STORE_SLUG, source="storefront"):
    if not items:
        raise ValueError("No hay productos en el pedido.")

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM stores WHERE slug = %s", [store_slug])
            store_row = cursor.fetchone()

            if not store_row:
                raise ValueError("La tienda no existe.")

            store_id = store_row["id"]
            order_rows = []
            total = 0

            for item in items:
                product_id = int(item["product_id"])
                quantity = max(int(item.get("quantity", 0)), 0)

                if quantity <= 0:
                    continue

                cursor.execute(
                    """
                    SELECT id, name, price, stock
                    FROM products
                    WHERE id = %s AND is_active = TRUE
                    FOR UPDATE
                    """,
                    [product_id],
                )
                product = cursor.fetchone()

                if not product:
                    raise ValueError("Uno de los productos ya no existe.")

                if product["stock"] < quantity:
                    raise ValueError(f"No hay stock suficiente para {product['name']}.")

                line_total = int(product["price"]) * quantity
                total += line_total
                order_rows.append(
                    {
                        "product_id": product["id"],
                        "product_name": product["name"],
                        "unit_price": int(product["price"]),
                        "quantity": quantity,
                        "remaining_stock": int(product["stock"]) - quantity,
                    }
                )

            if not order_rows:
                raise ValueError("No hay productos validos en el pedido.")

            cursor.execute(
                """
                INSERT INTO orders (user_id, store_id, delivery_type, source, status, total, notes)
                VALUES (%s, %s, %s, %s, 'pending', %s, %s)
                RETURNING id, created_at, source
                """,
                [user_id, store_id, delivery_type, source, total, notes],
            )
            order = cursor.fetchone()

            for row in order_rows:
                cursor.execute(
                    """
                    INSERT INTO order_items (order_id, product_id, product_name_snapshot, unit_price, quantity)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    [
                        order["id"],
                        row["product_id"],
                        row["product_name"],
                        row["unit_price"],
                        row["quantity"],
                    ],
                )
                cursor.execute(
                    "UPDATE products SET stock = %s WHERE id = %s",
                    [row["remaining_stock"], row["product_id"]],
                )

            source_label = "agente inteligente" if source == "chatbot" else "tienda web"
            cursor.execute(
                """
                INSERT INTO transactions (type, amount, description, order_id)
                VALUES ('sale', %s, %s, %s)
                """,
                [
                    total,
                    f"Pedido #{order['id']} registrado {('a domicilio' if delivery_type == 'delivery' else 'para recoger')} desde {source_label}",
                    order["id"],
                ],
            )

        connection.commit()

    return {
        "id": str(order["id"]),
        "total": total,
        "total_mostrado": format_price(total),
        "delivery_type": delivery_type,
        "source": order["source"],
        "source_label": "Agente inteligente" if order["source"] == "chatbot" else "Tienda web",
        "items": [
            {
                "product_id": str(row["product_id"]),
                "product_name": row["product_name"],
                "unit_price": row["unit_price"],
                "unit_price_mostrado": format_price(row["unit_price"]),
                "quantity": row["quantity"],
            }
            for row in order_rows
        ],
        "created_at": order["created_at"].strftime("%d/%m/%Y %H:%M"),
    }


def list_recent_orders(limit=20):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT o.id, o.delivery_type, o.source, o.status, o.total, o.created_at,
                       u.username,
                       CONCAT(u.first_name, ' ', u.last_name) AS full_name
                FROM orders o
                INNER JOIN users u ON u.id = o.user_id
                ORDER BY o.created_at DESC, o.id DESC
                LIMIT %s
                """,
                [limit],
            )
            rows = cursor.fetchall()

    return [
        {
            "id": str(row["id"]),
            "delivery_type": row["delivery_type"],
            "source": row["source"],
            "source_label": "Agente inteligente" if row["source"] == "chatbot" else "Tienda web",
            "status": row["status"],
            "total": int(row["total"]),
            "total_mostrado": format_price(row["total"]),
            "date": row["created_at"].strftime("%d/%m/%Y %H:%M"),
            "username": row["username"],
            "full_name": row["full_name"],
        }
        for row in rows
    ]


def save_chat_message(user_id, role, message, metadata=None):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO chat_messages (user_id, role, message, metadata)
                VALUES (%s, %s, %s, %s)
                """,
                [user_id, role, message, Json(metadata or {})],
            )
        connection.commit()


def list_chat_messages(user_id, limit=12):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT role, message, metadata, created_at
                FROM chat_messages
                WHERE user_id = %s
                ORDER BY created_at DESC, id DESC
                LIMIT %s
                """,
                [user_id, limit],
            )
            rows = cursor.fetchall()

    return list(reversed(rows))


def clear_chat_messages(user_id):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM chat_messages
                WHERE user_id = %s
                """,
                [user_id],
            )
        connection.commit()


def search_products(term, limit=5):
    normalized = f"%{term.strip()}%"

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, price, image, category_id, offer, description, stock
                FROM products
                WHERE name ILIKE %s AND is_active = TRUE
                ORDER BY name
                LIMIT %s
                """,
                [normalized, limit],
            )
            return [map_product(row) for row in cursor.fetchall()]


def find_best_product_match(message):
    terms = extract_meaningful_terms(message)

    if not terms:
        return None

    # Try the most specific combinations first.
    for size in range(min(3, len(terms)), 0, -1):
        query = " ".join(terms[:size]).strip()

        if not query:
            continue

        matches = search_products(query, limit=3)

        if matches:
            return matches[0]

    return None


def _quantity_from_segment(segment):
    text = normalize_text(segment)
    number_match = re.search(r"\b(\d+)\b", text)

    if number_match:
        return max(int(number_match.group(1)), 1)

    word_quantities = {
        "un": 1,
        "uno": 1,
        "una": 1,
        "dos": 2,
        "tres": 3,
        "cuatro": 4,
        "cinco": 5,
        "seis": 6,
        "siete": 7,
        "ocho": 8,
        "nueve": 9,
        "diez": 10,
    }

    for word, quantity in word_quantities.items():
        if re.search(rf"\b{word}\b", text):
            return quantity

    return 1


def find_multiple_product_matches(message, limit=6):
    normalized = normalize_text(message)

    if not normalized:
        return []

    matches = []
    seen_ids = set()

    for product in list_products():
        product_name = normalize_text(product["nombre"])
        variants = {product_name}
        variants.update(part for part in product_name.split() if len(part) >= 3)

        if not any(variant and variant in normalized for variant in variants):
            continue

        quantity = 1
        segments = re.split(r",| y | e ", normalized)

        for segment in segments:
            if any(variant and variant in segment for variant in variants):
                quantity = _quantity_from_segment(segment)
                break

        product_id = str(product["id"])

        if product_id in seen_ids:
            continue

        seen_ids.add(product_id)
        matches.append(
            {
                "product": product,
                "quantity": quantity,
            }
        )

        if len(matches) >= limit:
            break

    return matches


def build_multi_product_chat_response(matches, message="", delivery_type=None):
    if not matches:
        return None

    available_items = []
    unavailable_items = []

    for item in matches:
        product = item["product"]
        quantity = max(int(item.get("quantity", 1)), 1)
        stock = int(product["stock"] or 0)

        if stock <= 0:
            unavailable_items.append(product["nombre"])
            continue

        available_items.append(
            {
                "product_id": product["id"],
                "product_name": product["nombre"],
                "quantity": min(quantity, stock),
                "unit_price": int(product["precio"]),
                "unit_price_mostrado": product["precio_mostrado"],
                "stock": stock,
            }
        )

    if not available_items:
        names = ", ".join(unavailable_items[:3])
        return {
            "reply": (
                f"Revise tu solicitud, pero ahora mismo no tengo disponibilidad de {names}. "
                "Si quieres, te ayudo a buscar otras opciones del catalogo."
            ),
            "action": "open_search",
            "options": [{"id": "buscar", "label": "Buscar otro producto"}],
        }

    summary = ", ".join(
        f"{item['quantity']} x {item['product_name']}" for item in available_items
    )
    total = sum(item["unit_price"] * item["quantity"] for item in available_items)
    total_display = format_price(total)

    unavailable_note = ""
    if unavailable_items:
        unavailable_note = f" No pude incluir {', '.join(unavailable_items[:3])} porque no tiene stock ahora mismo."

    if delivery_type == "delivery":
        reply = (
            f"Listo, te entendí este domicilio con varios productos: {summary}. "
            f"El total estimado es {total_display}.{unavailable_note} "
            "Si quieres, lo registro de una vez y te abro WhatsApp para confirmarlo."
        )
        action = "prepare_multi_delivery"
    elif delivery_type == "pickup":
        reply = (
            f"Perfecto, te entendí este pedido con varios productos: {summary}. "
            f"El total estimado es {total_display}.{unavailable_note} "
            "Si quieres, lo registro de una vez y te abro WhatsApp para confirmarlo."
        )
        action = "prepare_multi_pickup"
    else:
        reply = (
            f"Te armé esta lista con varios productos: {summary}. "
            f"El total estimado es {total_display}.{unavailable_note} "
            "Dime si lo quieres como pedido para recoger o como domicilio y yo lo dejo listo."
        )
        action = "show_multi_product_options"

    return {
        "reply": reply,
        "action": action,
        "items": [
            {"product_id": item["product_id"], "quantity": item["quantity"]}
            for item in available_items
        ],
        "item_count": len(available_items),
        "total_display": total_display,
        "options": [
            {"id": "multi-pickup", "label": "Realizar pedido", "kind": "multi_order", "delivery_type": "pickup"},
            {"id": "multi-delivery", "label": "Pedir domicilio", "kind": "multi_order", "delivery_type": "delivery"},
        ],
        "source": "structured",
    }


def choose_chatbot_variant(seed_text, options):
    if not options:
        return ""

    digest = md5((seed_text or "").encode("utf-8", errors="ignore")).hexdigest()
    index = int(digest, 16) % len(options)
    return options[index]


def get_cheapest_available_product():
    products = [product for product in list_products() if int(product["stock"] or 0) > 0]

    if not products:
        products = list_products()

    if not products:
        return None

    return min(products, key=lambda product: (int(product["precio"]), product["nombre"].lower()))


def build_product_chat_options(product):
    if int(product["stock"] or 0) <= 0:
        return [
            {"id": "buscar", "label": "Buscar otro producto"},
            {"id": "ofertas", "label": "Quiero ver ofertas"},
        ]

    return [
        {
            "id": f"add-{product['id']}",
            "label": "Agregar al carrito",
            "kind": "add_to_cart",
            "product_id": product["id"],
        },
        {
            "id": f"pickup-{product['id']}",
            "label": "Realizar pedido",
            "kind": "quick_order",
            "delivery_type": "pickup",
            "product_id": product["id"],
        },
        {
            "id": f"delivery-{product['id']}",
            "label": "Pedir domicilio",
            "kind": "quick_order",
            "delivery_type": "delivery",
            "product_id": product["id"],
        },
    ]


def message_mentions_stock(message):
    normalized = normalize_text(message)
    return any(
        keyword in normalized
        for keyword in ("stock", "disponible", "disponibilidad", "quedan", "cuantas", "cantidad", "unidades")
    )


def message_mentions_price(message):
    normalized = normalize_text(message)
    return any(keyword in normalized for keyword in ("precio", "costo", "cuanto vale", "cuanto cuesta"))


def build_product_chat_response(product, message=""):
    stock = int(product["stock"] or 0)
    seed = f"{normalize_text(message)}::{product['nombre']}::{stock}"
    show_stock = message_mentions_stock(message)

    if stock > 0:
        if show_stock:
            reply = choose_chatbot_variant(
                seed,
                [
                    (
                        f"Te encontre {product['nombre']}. Su precio actual es {product['precio_mostrado']}. "
                        f"{product['descripcion']} En este momento tenemos {stock} unidades disponibles. "
                        "Si quieres, te ayudo a realizar un pedido o a pedir domicilio y luego lo confirmamos por WhatsApp."
                    ),
                    (
                        f"Claro, este es el producto {product['nombre']}. Vale {product['precio_mostrado']} y {product['descripcion']} "
                        f"Ahora mismo contamos con {stock} unidades disponibles. "
                        "Quieres que te lo deje listo para pedido o prefieres domicilio? La confirmacion final la hacemos por WhatsApp."
                    ),
                    (
                        f"Ya revise el catalogo y encontre {product['nombre']}. Precio: {product['precio_mostrado']}. "
                        f"{product['descripcion']} En stock hay {stock} unidades disponibles. "
                        "Deseas realizar el pedido o te lo gestiono con domicilio? Luego te abrimos WhatsApp para confirmarlo."
                    ),
                ],
            )
        else:
            reply = choose_chatbot_variant(
                seed,
                [
                    (
                        f"Te encontre {product['nombre']}. Su precio actual es {product['precio_mostrado']}. "
                        f"{product['descripcion']} Si quieres, te ayudo a realizar un pedido o a pedir domicilio y luego seguimos por WhatsApp."
                    ),
                    (
                        f"Claro, este es el producto {product['nombre']}. Vale {product['precio_mostrado']} y {product['descripcion']} "
                        "Quieres que te lo deje listo para pedido o prefieres domicilio? La confirmacion va por WhatsApp."
                    ),
                    (
                        f"Ya revise el catalogo y encontre {product['nombre']}. Precio: {product['precio_mostrado']}. "
                        f"{product['descripcion']} Deseas realizar el pedido o te lo gestiono con domicilio? Te acompano hasta dejarlo listo por WhatsApp."
                    ),
                ],
            )
    else:
        reply = choose_chatbot_variant(
            seed,
            [
                (
                    f"Encontre {product['nombre']}, pero ahora mismo esta agotado. "
                    f"Su ultimo precio registrado es {product['precio_mostrado']}. {product['descripcion']} "
                    "Si quieres, te ayudo a buscar otra opcion parecida."
                ),
                (
                    f"Si tenemos registrado {product['nombre']}, aunque en este momento no hay unidades disponibles. "
                    f"Su precio es {product['precio_mostrado']} y {product['descripcion']} "
                    "Puedo mostrarte otro producto o ayudarte a revisar el catalogo."
                ),
            ],
        )

    return {
        "reply": reply,
        "action": "show_product_options" if stock > 0 else "open_search",
        "search_term": product["nombre"],
        "product_id": product["id"],
        "product_name": product["nombre"],
        "product_description": product["descripcion"],
        "price_display": product["precio_mostrado"],
        "product_stock": stock,
        "show_stock": show_stock or stock <= 0,
        "image_path": product["imagen"],
        "options": build_product_chat_options(product),
    }


def build_cheapest_product_chat_response(message=""):
    product = get_cheapest_available_product()

    if not product:
        return {
            "reply": "En este momento no tengo productos disponibles para recomendarte, pero puedo ayudarte a revisar el catalogo cuando lo necesites."
        }

    stock = int(product["stock"] or 0)
    seed = f"economico::{normalize_text(message)}::{product['nombre']}::{stock}"
    show_stock = message_mentions_stock(message)
    if show_stock:
        reply = choose_chatbot_variant(
            seed,
            [
                (
                    f"El producto mas economico que tengo ahora mismo es {product['nombre']}. "
                    f"Vale {product['precio_mostrado']}, {product['descripcion']} y contamos con {stock} unidades disponibles. "
                    "Si quieres, te lo dejo listo para pedido, domicilio o agregar al carrito, y la confirmacion final va por WhatsApp."
                ),
                (
                    f"Claro. La opcion mas economica del catalogo en este momento es {product['nombre']} por {product['precio_mostrado']}. "
                    f"{product['descripcion']} Ademas, hay {stock} unidades disponibles. "
                    "Quieres que te ayude a pedirlo o prefieres domicilio? Despues lo confirmas por WhatsApp."
                ),
            ],
        )
    else:
        reply = choose_chatbot_variant(
            seed,
            [
                (
                    f"El producto mas economico que tengo ahora mismo es {product['nombre']}. "
                    f"Vale {product['precio_mostrado']} y {product['descripcion']} "
                    "Si quieres, te lo dejo listo para pedido, domicilio o agregar al carrito."
                ),
                (
                    f"Claro. La opcion mas economica del catalogo en este momento es {product['nombre']} por {product['precio_mostrado']}. "
                    f"{product['descripcion']} Quieres que te ayude a pedirlo o prefieres domicilio? La confirmacion final la hacemos por WhatsApp."
                ),
            ],
        )

    return {
        **build_product_chat_response(product, message),
        "reply": reply,
        "search_term": "producto mas economico",
        "show_stock": show_stock,
    }


def message_requests_delivery(message):
    normalized = normalize_text(message)
    return any(keyword in normalized for keyword in ("domicilio", "envio", "entrega"))


def message_requests_pickup(message):
    normalized = normalize_text(message)
    return any(keyword in normalized for keyword in ("pedido", "comprar", "recoger", "llevar"))


def message_confirms_choice(message):
    normalized = normalize_text(message)
    words = normalized.replace("?", " ").replace(",", " ").split()
    if len(words) > 3:
        return False
    return any(word in CHATBOT_CONFIRM_WORDS for word in words)


def message_is_product_search(message):
    normalized = normalize_text(message)
    return any(
        keyword in normalized
        for keyword in (
            "buscar",
            "busca",
            "buscame",
            "muestrame",
            "muéstrame",
            "producto",
            "productos",
            "precio",
            "costo",
            "cuanto",
            "stock",
            "disponible",
            "cantidad",
            "unidades",
            "tienen",
            "quiero",
            "necesito",
        )
    )


def message_is_off_topic(message):
    normalized = normalize_text(message)
    return any(keyword in normalized for keyword in OFF_TOPIC_KEYWORDS)


def build_chatbot_response(message):
    normalized = normalize_text(message)
    search_term = ""
    tokens = extract_meaningful_terms(message)
    matched_product = find_best_product_match(message)
    multi_matches = find_multiple_product_matches(message)
    requested_delivery_type = "delivery" if message_requests_delivery(message) else "pickup" if message_requests_pickup(message) else None

    if len(multi_matches) >= 2:
        multi_response = build_multi_product_chat_response(multi_matches, message, requested_delivery_type)

        if multi_response:
            return multi_response

    if any(
        keyword in normalized
        for keyword in ("mas economico", "más economico", "mas barato", "más barato", "producto economico", "producto barato")
    ):
        return build_cheapest_product_chat_response(message)

    if any(keyword in normalized for keyword in ("hola", "buenas", "buenos")):
        return {
            "reply": choose_chatbot_variant(
                normalized,
                [
                    "Hola. Que bueno tenerte por aqui. Puedo ayudarte con productos, precios, stock, pedidos y domicilios.",
                    "Hola, bienvenido a MercApp. Si quieres, revisamos productos, precios o te acompano con tu pedido.",
                    "Buenas. Estoy listo para ayudarte con tu compra: puedo buscar productos, revisar stock y organizar pedido o domicilio.",
                    "Hola. Dime que producto necesitas y yo te ayudo con precio, disponibilidad y pedido por WhatsApp.",
                ],
            )
        }

    if any(keyword in normalized for keyword in ("como estas", "como vas", "que tal")):
        return {
            "reply": choose_chatbot_variant(
                normalized,
                [
                    "Voy muy bien, gracias. Estoy listo para ayudarte a encontrar productos o dejarte un pedido listo.",
                    "Todo bien por aqui. Dime que producto buscas y te cuento precio, stock y opciones de pedido.",
                    "Muy bien. Si quieres, empezamos buscando el producto que necesitas y te acompano hasta el pedido.",
                    "Todo bien. Si me dices que producto necesitas, te ayudo de una con la compra dentro de la tienda.",
                ],
            )
        }

    if any(keyword in normalized for keyword in ("quien eres", "quien sos", "como te llamas")):
        return {
            "reply": choose_chatbot_variant(
                normalized,
                [
                    "Soy el asistente virtual de MercApp y estoy para ayudarte con productos, precios, stock, pedidos y domicilios.",
                    "Soy MercAppBot. Te acompano con la compra dentro del supermercado: busqueda de productos, stock, pedido y domicilio.",
                ],
            )
        }

    if "gracias" in normalized:
        return {
            "reply": choose_chatbot_variant(
                normalized,
                [
                    "Con mucho gusto. Si quieres seguir comprando, aqui sigo para ayudarte.",
                    "Para eso estoy. Si necesitas otro producto o quieres revisar domicilio, me dices.",
                    "Encantado de ayudarte. Si quieres, podemos seguir con otro producto o con tu pedido.",
                ],
            )
        }

    if any(keyword in normalized for keyword in ("recomiend", "oferta", "ofertas", "suger")):
        offers = [product for product in list_products() if product["oferta"] and product["stock"] > 0][:3]

        if offers:
            recomendados = ", ".join(
                f"{product['nombre']} ({product['precio_mostrado']})" for product in offers
            )
            return {
                "reply": (
                    f"Claro. Ahora mismo te puedo recomendar estas opciones: {recomendados}. "
                    "Si alguno te interesa, escribeme su nombre y te cuento precio, descripcion y stock exacto."
                )
            }

        return {
            "reply": "Puedo ayudarte a revisar el catalogo completo. Dime el nombre de un producto y te cuento precio, descripcion y stock."
        }

    if matched_product and (
        message_is_product_search(message)
        or len(tokens) == 1
        or any(term in matched_product["nombre"].lower() for term in tokens)
    ):
        return build_product_chat_response(matched_product, message)

    if any(keyword in normalized for keyword in ("domicilio", "envio", "entrega")):
        return {
            "reply": choose_chatbot_variant(
                normalized,
                [
                    "Claro. Si quieres domicilio, agrega tus productos al carrito y luego pulsa el boton de pedir domicilio. Yo te voy guiando y al final lo confirmas por WhatsApp.",
                    "Sin problema. Podemos manejarlo con domicilio: agrega lo que necesitas y luego confirmas el envio desde el carrito. Despues seguimos por WhatsApp.",
                ],
            ),
            "action": "open_cart",
        }

    if any(keyword in normalized for keyword in ("pedido", "comprar")):
        return {
            "reply": choose_chatbot_variant(
                normalized,
                [
                    "Perfecto. Vamos con tu pedido. Agrega los productos al carrito y luego lo confirmas desde ahi. El cierre final va por WhatsApp.",
                    "Listo, te acompano con el pedido. Solo agrega los productos y al final lo confirmas en el carrito. Luego seguimos por WhatsApp.",
                ],
            ),
            "action": "open_cart",
        }

    if any(keyword in normalized for keyword in ("precio", "costo", "cuanto", "buscar", "producto", "tienen", "stock", "disponible")):
        search_term = " ".join(tokens[-3:]).strip()

        if not search_term:
            return {
                "reply": choose_chatbot_variant(
                    normalized,
                    [
                        "Dime el nombre del producto y te ayudo a buscarlo en el catalogo.",
                        "Claro. Escribeme el nombre del producto y reviso precio, descripcion y stock por ti.",
                    ],
                ),
                "action": "open_search",
            }

        return {
            "reply": (
                f"No encontre coincidencias para \"{search_term}\". "
                "Si quieres, prueba con otro nombre o escribeme una palabra mas corta para ayudarte mejor."
            ),
            "action": "open_search",
            "search_term": search_term,
        }

    if any(keyword in normalized for keyword in ("pago", "pagar")):
        return {
            "reply": choose_chatbot_variant(
                normalized,
                [
                    "La confirmacion del pedido se hace por WhatsApp. Desde este flujo no manejamos pago con tarjeta.",
                    "Cuando dejes listo el pedido, te abrimos WhatsApp para continuarlo. No aceptamos tarjeta desde este canal.",
                    "El cierre del pedido va por WhatsApp y por aqui no se procesa pago con tarjeta.",
                ],
            )
        }

    if any(keyword in normalized for keyword in ("horario", "hora")):
        return {
            "reply": choose_chatbot_variant(
                normalized,
                [
                    "El catalogo esta disponible todo el tiempo y los pedidos se gestionan en horario comercial.",
                    "Puedes revisar productos cuando quieras. Los pedidos se procesan dentro del horario comercial de la tienda.",
                ],
            )
        }

    if message_is_off_topic(message):
        return {
            "reply": choose_chatbot_variant(
                normalized,
                [
                    "Jajaja, ese tema se sale un poco de lo mio. Yo aqui te acompano con la tienda. Si quieres, dime que producto necesitas y lo revisamos.",
                    "De eso no soy el mejor para hablarte. Pero para compras si estoy fino: productos, precios, stock, pedidos o domicilios. Que te busco?",
                    "Te seguiria la conversacion, pero aqui estoy mas concentrado en ayudarte con el supermercado. Si quieres, arrancamos con un producto o con tu pedido.",
                    "Ese tema esta bueno, pero por aqui me encargo de la tienda. Dime si buscas algo del catalogo y te ayudo de una.",
                    "Me salgo del libreto si me voy por ahi. Mejor te ayudo con algo util de la tienda: precios, productos, stock, pedido o domicilio.",
                    "Te entiendo, pero mi fuerte aqui es ayudarte con la compra. Si quieres, dime que se te antoja o que producto necesitas.",
                ],
            )
        }

    return {
        "reply": choose_chatbot_variant(
            normalized,
            [
                "Si quieres, te ayudo con la compra. Dime el producto y te cuento precio, descripcion, stock y como pedirlo.",
                "Estoy pendiente para ayudarte con la tienda. Puedes decirme un producto, pedir recomendaciones o armar un pedido.",
                "Vamos paso a paso si quieres. Dime que necesitas comprar y yo te acompano con precios, stock, pedido o domicilio.",
                "Aqui te ayudo con lo del supermercado. Si ya sabes que necesitas, escribeme el nombre del producto y arrancamos.",
                "Si andas buscando algo para comprar, yo te ayudo de una. Dime el producto o cuentame si quieres pedido o domicilio.",
            ],
        ),
    }


load_local_env()
