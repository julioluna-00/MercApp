from functools import wraps
from pathlib import Path
from urllib.parse import quote

from flask import Flask, jsonify, redirect, render_template, request, session, url_for

from psycopg import OperationalError

from chatbot_service import generate_chatbot_response, get_chatbot_status, naturalize_chatbot_response
from database import (
    DatabaseConfigError,
    authenticate_user,
    build_product_chat_response,
    build_multi_product_chat_response,
    clear_chat_messages,
    create_order,
    create_transaction,
    create_user,
    delete_product,
    find_best_product_match,
    find_multiple_product_matches,
    get_product,
    get_store_by_slug,
    get_transaction_summary,
    get_user_by_id,
    get_user_by_username,
    initialize_database,
    list_chat_messages,
    list_categories,
    list_products,
    list_recent_orders,
    list_stores,
    list_transactions,
    message_confirms_choice,
    message_requests_delivery,
    message_requests_pickup,
    restore_default_products,
    save_chat_message,
    save_product,
)

app = Flask(__name__)
app.secret_key = "mercaapp-secret-key"

database_boot_error = None
WHATSAPP_NUMBER = "573118627767"

try:
    initialize_database()
except Exception as error:  # pragma: no cover - the app should still boot to show the config error.
    database_boot_error = str(error)


def ensure_database_ready():
    if database_boot_error:
        raise DatabaseConfigError(database_boot_error)


@app.context_processor
def inject_asset_version():
    def asset_version(relative_path):
        try:
            asset_path = Path(app.static_folder) / relative_path
            return int(asset_path.stat().st_mtime)
        except OSError:
            return 0

    return {"asset_version": asset_version}


def current_user():
    ensure_database_ready()

    user_id = session.get("user_id")
    username = session.get("username")
    user = None

    if user_id:
        user = get_user_by_id(user_id)

    if not user and username:
        user = get_user_by_username(username)

    if not user:
        return None

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["is_admin"] = bool(user["is_admin"])

    return user


def authenticated_user():
    try:
        return current_user()
    except (DatabaseConfigError, OperationalError):
        return None


def user_is_admin():
    user = authenticated_user()
    return bool(user and user.get("is_admin"))


def login_required(view_function):
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        if not authenticated_user():
            return redirect(url_for("login"))
        return view_function(*args, **kwargs)

    return wrapped_view


def admin_required(view_function):
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        if not user_is_admin():
            return redirect(url_for("tienda"))
        return view_function(*args, **kwargs)

    return wrapped_view


def build_user_payload(user):
    return {
        "id": user["id"],
        "username": user["username"],
        "nombre": user["full_name"],
        "correo": user["email"],
        "telefono": user["phone"],
        "direccion": user["address"],
        "estado": "Activo",
        "ultimoAcceso": "Hoy",
        "isAdmin": bool(user["is_admin"]),
        "firstName": user["first_name"],
        "lastName": user["last_name"],
    }


def get_pending_chatbot_product():
    product_id = session.get("chatbot_pending_product_id")

    if not product_id:
        return None

    product = get_product(product_id)

    if not product:
        session.pop("chatbot_pending_product_id", None)

    return product


def set_pending_chatbot_product(product_id):
    if product_id:
        session["chatbot_pending_product_id"] = str(product_id)
    else:
        session.pop("chatbot_pending_product_id", None)


def get_pending_chatbot_items():
    items = session.get("chatbot_pending_items")

    if not isinstance(items, list):
        return []

    normalized_items = []

    for item in items:
        try:
            product_id = str(item.get("product_id", "")).strip()
            quantity = max(int(item.get("quantity", 0)), 0)
        except (TypeError, ValueError, AttributeError):
            continue

        if not product_id or quantity <= 0:
            continue

        product = get_product(product_id)

        if not product:
            continue

        normalized_items.append({"product_id": product_id, "quantity": quantity})

    if len(normalized_items) != len(items):
        set_pending_chatbot_items(normalized_items)

    return normalized_items


def set_pending_chatbot_items(items):
    normalized_items = []

    for item in items or []:
        try:
            product_id = str(item.get("product_id", "")).strip()
            quantity = max(int(item.get("quantity", 0)), 0)
        except (TypeError, ValueError, AttributeError):
            continue

        if product_id and quantity > 0:
            normalized_items.append({"product_id": product_id, "quantity": quantity})

    if normalized_items:
        session["chatbot_pending_items"] = normalized_items
    else:
        session.pop("chatbot_pending_items", None)


def get_recent_chatbot_product(history):
    for row in reversed(history):
        metadata = row.get("metadata") or {}

        if row.get("role") == "bot" and not metadata.get("product_id"):
            break

        product_id = metadata.get("product_id")

        if not product_id:
            continue

        product = get_product(product_id)

        if product:
            return product

    return None


def get_recent_chatbot_whatsapp_context(history):
    for row in reversed(history):
        if row.get("role") != "bot":
            continue

        metadata = row.get("metadata") or {}
        whatsapp_url = str(metadata.get("whatsapp_url") or "").strip()
        order_id = metadata.get("order_id")

        if not whatsapp_url:
            continue

        return {
            "whatsapp_url": whatsapp_url,
            "order_id": order_id,
            "item_count": metadata.get("item_count"),
        }

    return None


def message_uses_recent_product_context(message):
    normalized = message.lower().strip()
    context_clues = (
        "ese producto",
        "esa opcion",
        "ese",
        "esa",
        "lo quiero",
        "me interesa",
        "agregalo",
        "agregarlo",
        "al carrito",
        "y el stock",
        "y cuanto",
        "y cuantas",
        "cuanto queda",
        "cuantas quedan",
        "cuantas hay",
        "y el precio",
        "de una",
    )
    return any(clue in normalized for clue in context_clues)


def message_requests_whatsapp_retry(message):
    normalized = normalize_chat_message(message)
    retry_clues = (
        "no se me abrio el whatsapp",
        "no se abrio el whatsapp",
        "no se abrió el whatsapp",
        "no abre whatsapp",
        "no abrio whatsapp",
        "no abrió whatsapp",
        "abre whatsapp",
        "abrir whatsapp",
        "mandame el whatsapp",
        "enviame el whatsapp",
        "envíame el whatsapp",
        "reenviar whatsapp",
        "reabrir whatsapp",
        "comunicarme con el dueño",
        "comunicarme con el dueno",
        "hablar con el dueño",
        "hablar con el dueno",
        "contactar al dueño",
        "contactar al dueno",
    )
    return any(clue in normalized for clue in retry_clues)


def normalize_chat_message(message):
    return (message or "").strip().lower()


def message_mentions_context_product(message, product):
    if not product:
        return False

    normalized_message = normalize_chat_message(message)
    product_name = normalize_chat_message(product.get("nombre", ""))

    if product_name and product_name in normalized_message:
        return True

    significant_parts = [part for part in product_name.split() if len(part) >= 4]
    return any(part in normalized_message for part in significant_parts)


def should_use_context_product(message, context_product):
    if not context_product:
        return False

    matched_product = find_best_product_match(message)

    if matched_product and str(matched_product["id"]) != str(context_product["id"]):
        return False

    if matched_product and str(matched_product["id"]) == str(context_product["id"]):
        return True

    if message_mentions_context_product(message, context_product):
        return True

    if message_confirms_choice(message) or message_uses_recent_product_context(message):
        return True

    if message_requests_delivery(message) or message_requests_pickup(message):
        return False

    return False


def build_whatsapp_message(user, order):
    customer_name = (user.get("full_name") or user.get("username") or "Cliente").strip()
    delivery_label = "domicilio" if order["delivery_type"] == "delivery" else "pedido para recoger"
    lines = [
        f"Hola, quiero confirmar un {delivery_label} desde MercApp.",
        f"Cliente: {customer_name}",
        f"Pedido #{order['id']}",
        "Productos:",
    ]

    for item in order.get("items", []):
        lines.append(
            f"- {item['product_name']} x{item['quantity']} ({item['unit_price_mostrado']} c/u)"
        )

    lines.append(f"Total: {order['total_mostrado']}")

    if order["delivery_type"] == "delivery" and user.get("address"):
        lines.append(f"Direccion: {user['address']}")

    lines.append("Quedo atento a la confirmacion. Gracias.")
    return "\n".join(lines)


def build_whatsapp_url(message):
    return f"https://wa.me/{WHATSAPP_NUMBER}?text={quote(message)}"


def build_order_whatsapp_url(user, order):
    return build_whatsapp_url(build_whatsapp_message(user, order))


def build_choice_prompt_response(product):
    return {
        "reply": (
            f"Perfecto. Ya identifique {product['nombre']} por {product['precio_mostrado']}. "
            "Deseas realizar un pedido para recoger o pedir domicilio?"
        ),
        "action": "show_product_options",
        "search_term": product["nombre"],
        "product_id": product["id"],
        "product_name": product["nombre"],
        "product_description": product["descripcion"],
        "price_display": product["precio_mostrado"],
        "product_stock": product["stock"],
        "show_stock": False,
        "image_path": product["imagen"],
        "options": [
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
        ],
        "source": "structured",
    }


def build_missing_product_confirmation_response():
    return {
        "reply": (
            "Claro. Primero necesito que me digas el nombre exacto del producto que quieres pedir "
            "o que lo agregues al carrito, y desde ahi te ayudo con pedido o domicilio."
        ),
        "action": "open_search",
        "search_term": "",
        "options": [
            {"id": "buscar", "label": "Buscar producto"},
            {"id": "pedido", "label": "Quiero hacer pedido"},
            {"id": "domicilio", "label": "Quiero pedir domicilio"},
        ],
        "source": "structured",
    }


def build_whatsapp_retry_response(whatsapp_context):
    order_id = whatsapp_context.get("order_id")
    order_label = f" del pedido #{order_id}" if order_id else ""
    return {
        "reply": (
            f"Tienes razon, ahi debi ayudarte a retomar WhatsApp{order_label}. "
            "Voy a reabrirtelo para que puedas terminar la confirmacion y comunicarte con el dueno."
        ),
        "action": "retry_whatsapp",
        "whatsapp_url": whatsapp_context.get("whatsapp_url"),
        "options": [
            {
                "id": "retry-whatsapp",
                "label": "Reabrir WhatsApp",
                "kind": "action",
                "action": "retry_whatsapp",
            }
        ],
        "source": "structured",
    }


def build_multi_order_created_response(order, delivery_type, user):
    delivery_text = "con domicilio" if delivery_type == "delivery" else "para recoger en tienda"
    return {
        "reply": (
            f"Listo. Ya registre tu pedido de varios productos {delivery_text}. "
            f"Tu numero es #{order['id']} por {order['total_mostrado']}. "
            "Ahora te abrire WhatsApp con el resumen para confirmarlo. "
            "La gestion final se hace por WhatsApp y no aceptamos tarjeta desde este flujo."
        ),
        "action": "refresh_catalog",
        "order": order,
        "item_count": len(order.get("items", [])),
        "whatsapp_url": build_order_whatsapp_url(user, order),
        "source": "structured",
    }


def build_order_created_response(product, order, user):
    delivery_text = "con domicilio" if order["delivery_type"] == "delivery" else "para recoger en tienda"
    return {
        "reply": (
            f"Listo. Ya registre tu pedido de {product['nombre']} {delivery_text}. "
            f"Tu numero es #{order['id']} por {order['total_mostrado']}. "
            "Ahora te abrire WhatsApp con el resumen para confirmarlo. "
            "La continuacion del pedido se hace por WhatsApp y no manejamos pago con tarjeta desde este canal."
        ),
        "action": "refresh_catalog",
        "product_name": product["nombre"],
        "price_display": product["precio_mostrado"],
        "product_stock": product["stock"],
        "show_stock": False,
        "image_path": product["imagen"],
        "order": order,
        "whatsapp_url": build_order_whatsapp_url(user, order),
        "source": "structured",
    }


def build_cart_order_created_response(order, item_count, delivery_type, user):
    delivery_text = "con domicilio" if delivery_type == "delivery" else "para recoger en tienda"
    return {
        "reply": (
            f"Listo. Ya registre tu pedido de {item_count} producto{'s' if item_count != 1 else ''} {delivery_text}. "
            f"Tu numero es #{order['id']} por {order['total_mostrado']}. "
            "Ahora te abrire WhatsApp con el resumen para continuar la confirmacion. "
            "La gestion final se hace por WhatsApp y no aceptamos tarjeta desde este flujo."
        ),
        "action": "refresh_catalog",
        "order": order,
        "item_count": item_count,
        "whatsapp_url": build_order_whatsapp_url(user, order),
        "source": "structured",
    }


def build_chatbot_message_metadata(response):
    return {
        "action": response.get("action"),
        "search_term": response.get("search_term"),
        "product_id": response.get("product_id"),
        "product_name": response.get("product_name"),
        "price_display": response.get("price_display"),
        "product_stock": response.get("product_stock"),
        "show_stock": response.get("show_stock"),
        "image_path": response.get("image_path"),
        "options": response.get("options") or [],
        "source": response.get("source"),
        "model": response.get("model"),
        "order_id": response.get("order", {}).get("id") if response.get("order") else None,
        "item_count": response.get("item_count"),
        "whatsapp_url": response.get("whatsapp_url"),
    }


def serialize_chat_message(row):
    created_at = row.get("created_at")
    return {
        "role": row.get("role"),
        "message": row.get("message"),
        "metadata": row.get("metadata") or {},
        "created_at": created_at.isoformat() if created_at else None,
    }


def database_error_response(message, status_code=500):
    if request.path.startswith("/api/"):
        return jsonify({"ok": False, "error": message}), status_code

    return message, status_code


@app.errorhandler(DatabaseConfigError)
def handle_database_config_error(error):
    return database_error_response(
        f"Configuracion pendiente de PostgreSQL: {error}",
        500,
    )


@app.errorhandler(OperationalError)
def handle_database_operational_error(error):
    return database_error_response(
        f"No pudimos conectar con PostgreSQL: {error}",
        500,
    )


@app.route("/")
def home():
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None

    try:
        ensure_database_ready()

        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            user = authenticate_user(username, password)

            if user:
                session["user_id"] = user["id"]
                session["username"] = user["username"]
                session["is_admin"] = bool(user["is_admin"])
                return redirect(url_for("tiendas"))

            error = "Usuario o contrasena incorrectos."
    except (DatabaseConfigError, OperationalError) as exc:
        error = f"Base de datos no disponible: {exc}"

    return render_template("login.html", error=error)


@app.route("/register", methods=["GET", "POST"])
def register():
    error = None
    values = {
        "first_name": "",
        "last_name": "",
        "username": "",
        "phone": "",
        "address": "",
    }

    try:
        ensure_database_ready()

        if request.method == "POST":
            values = {
                "first_name": request.form.get("first_name", "").strip(),
                "last_name": request.form.get("last_name", "").strip(),
                "username": request.form.get("username", "").strip(),
                "phone": request.form.get("phone", "").strip(),
                "address": request.form.get("address", "").strip(),
            }
            password = request.form.get("password", "")
            username = values["username"]

            if not all([values["first_name"], values["last_name"], username, values["phone"], values["address"], password]):
                error = "Completa todos los campos para crear tu cuenta."
            elif get_user_by_username(username):
                error = "El usuario ya existe."
            else:
                create_user(
                    values["first_name"],
                    values["last_name"],
                    username,
                    values["phone"],
                    values["address"],
                    password,
                )
                return redirect(url_for("login"))
    except (DatabaseConfigError, OperationalError) as exc:
        error = f"Base de datos no disponible: {exc}"

    return render_template("register.html", error=error, values=values)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/tiendas")
@login_required
def tiendas():
    ensure_database_ready()
    return render_template("tiendas.html", tiendas=list_stores(), is_admin=user_is_admin())


@app.route("/tienda")
@login_required
def tienda():
    ensure_database_ready()
    tienda_actual = get_store_by_slug()

    return render_template(
        "tienda.html",
        tienda=tienda_actual,
        categorias=list_categories(),
        productos=list_products(),
        is_admin=user_is_admin(),
    )


@app.route("/admin")
@admin_required
def admin():
    ensure_database_ready()
    active_tab = request.args.get("tab", "products")
    edit_id = request.args.get("edit", "").strip()
    edit_product = get_product(edit_id) if edit_id else None

    return render_template(
        "admin.html",
        products=list_products(),
        transactions=list_transactions(),
        categories=[categoria for categoria in list_categories() if categoria["id"] != "inicio"],
        active_tab=active_tab,
        edit_product=edit_product,
        resumen=get_transaction_summary(),
        recent_orders=list_recent_orders(),
    )


@app.route("/admin/productos/guardar", methods=["POST"])
@admin_required
def admin_guardar_producto():
    ensure_database_ready()
    product_id = request.form.get("product_id", "").strip() or None
    save_product(request.form, product_id=product_id)
    return redirect(url_for("admin", tab="products"))


@app.route("/admin/productos/<product_id>/eliminar", methods=["POST"])
@admin_required
def admin_eliminar_producto(product_id):
    ensure_database_ready()
    delete_product(product_id)
    return redirect(url_for("admin", tab="products"))


@app.route("/admin/productos/restaurar", methods=["POST"])
@admin_required
def admin_restaurar_productos():
    ensure_database_ready()
    restore_default_products()
    return redirect(url_for("admin", tab="products"))


@app.route("/admin/transacciones", methods=["POST"])
@admin_required
def admin_agregar_transaccion():
    ensure_database_ready()
    transaction_type = request.form.get("type", "sale")
    amount = max(int(request.form.get("amount", "0") or 0), 0)
    description = request.form.get("description", "").strip()

    if amount > 0 and description:
        create_transaction(transaction_type, amount, description)

    return redirect(url_for("admin", tab="accounting"))


@app.route("/api/me")
@login_required
def api_me():
    ensure_database_ready()
    user = current_user()
    return jsonify({"ok": True, "user": build_user_payload(user)})


@app.route("/api/chatbot/message", methods=["POST"])
@login_required
def api_chatbot_message():
    ensure_database_ready()
    user = current_user()
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()

    if not message:
        return jsonify({"ok": False, "error": "Debes enviar un mensaje."}), 400

    save_chat_message(user["id"], "user", message)
    history = list_chat_messages(user["id"], limit=10)
    pending_product = get_pending_chatbot_product()
    pending_items = get_pending_chatbot_items()
    recent_product = get_recent_chatbot_product(history)
    recent_whatsapp_context = get_recent_chatbot_whatsapp_context(history)
    context_product = pending_product

    if not context_product and recent_product and should_use_context_product(message, recent_product):
        context_product = recent_product

    context_product_is_relevant = should_use_context_product(message, context_product)
    requested_delivery_type = "delivery" if message_requests_delivery(message) else "pickup" if message_requests_pickup(message) else ""

    if recent_whatsapp_context and message_requests_whatsapp_retry(message):
        response = build_whatsapp_retry_response(recent_whatsapp_context)
    elif pending_items and requested_delivery_type in {"delivery", "pickup"}:
        order = create_order(
            user["id"],
            items=pending_items,
            delivery_type=requested_delivery_type,
            source="chatbot",
        )
        set_pending_chatbot_items([])
        set_pending_chatbot_product(None)
        response = build_multi_order_created_response(order, requested_delivery_type, user)
        response = naturalize_chatbot_response(user, message, history, response)
    elif not context_product_is_relevant and message_confirms_choice(message):
        set_pending_chatbot_product(None)
        set_pending_chatbot_items([])
        response = build_missing_product_confirmation_response()
    elif context_product and context_product_is_relevant and message_requests_delivery(message):
        order = create_order(
            user["id"],
            items=[{"product_id": context_product["id"], "quantity": 1}],
            delivery_type="delivery",
            source="chatbot",
        )
        set_pending_chatbot_product(None)
        set_pending_chatbot_items([])
        response = build_order_created_response(context_product, order, user)
        response = naturalize_chatbot_response(user, message, history, response)
    elif context_product and context_product_is_relevant and message_requests_pickup(message):
        order = create_order(
            user["id"],
            items=[{"product_id": context_product["id"], "quantity": 1}],
            delivery_type="pickup",
            source="chatbot",
        )
        set_pending_chatbot_product(None)
        set_pending_chatbot_items([])
        response = build_order_created_response(context_product, order, user)
        response = naturalize_chatbot_response(user, message, history, response)
    elif context_product and context_product_is_relevant and message_confirms_choice(message):
        response = build_choice_prompt_response(context_product)
        set_pending_chatbot_product(context_product["id"])
        response = naturalize_chatbot_response(user, message, history, response)
    elif context_product and context_product_is_relevant and message_uses_recent_product_context(message):
        response = build_product_chat_response(context_product, message)
        if response.get("action") == "show_product_options":
            set_pending_chatbot_product(context_product["id"])
        response = naturalize_chatbot_response(user, message, history, response)
    else:
        response = generate_chatbot_response(user, message, history)

        if response.get("product_id") and response.get("action") == "show_product_options":
            set_pending_chatbot_product(response["product_id"])
            set_pending_chatbot_items([])
        elif response.get("items") and response.get("action") in {"show_multi_product_options", "prepare_multi_delivery", "prepare_multi_pickup"}:
            set_pending_chatbot_items(response["items"])
            set_pending_chatbot_product(None)
            if response.get("action") == "prepare_multi_delivery":
                order = create_order(user["id"], items=response["items"], delivery_type="delivery", source="chatbot")
                set_pending_chatbot_items([])
                response = build_multi_order_created_response(order, "delivery", user)
                response = naturalize_chatbot_response(user, message, history, response)
            elif response.get("action") == "prepare_multi_pickup":
                order = create_order(user["id"], items=response["items"], delivery_type="pickup", source="chatbot")
                set_pending_chatbot_items([])
                response = build_multi_order_created_response(order, "pickup", user)
                response = naturalize_chatbot_response(user, message, history, response)
        else:
            set_pending_chatbot_product(None)
            if not response.get("items"):
                set_pending_chatbot_items([])

    save_chat_message(
        user["id"],
        "bot",
        response["reply"],
        metadata=build_chatbot_message_metadata(response),
    )

    return jsonify({"ok": True, **response})


@app.route("/api/chatbot/history")
@login_required
def api_chatbot_history():
    ensure_database_ready()
    user = current_user()
    history = list_chat_messages(user["id"], limit=20)
    pending_product = get_pending_chatbot_product()
    contextual_options = []

    if pending_product:
        contextual_options = build_choice_prompt_response(pending_product)["options"]
    else:
        for row in reversed(history):
            metadata = row.get("metadata") or {}
            if row.get("role") != "bot":
                continue
            if metadata.get("action") == "show_product_options":
                contextual_options = metadata.get("options") or []
            break

    return jsonify(
        {
            "ok": True,
            "messages": [serialize_chat_message(row) for row in history],
            "pending_product_id": pending_product["id"] if pending_product else None,
            "contextual_options": contextual_options,
        }
    )


@app.route("/api/chatbot/history", methods=["DELETE"])
@login_required
def api_chatbot_clear_history():
    ensure_database_ready()
    user = current_user()
    clear_chat_messages(user["id"])
    set_pending_chatbot_product(None)
    return jsonify({"ok": True, "message": "Historial eliminado."})


@app.route("/api/chatbot/status")
@login_required
def api_chatbot_status():
    ensure_database_ready()
    return jsonify({"ok": True, **get_chatbot_status()})


@app.route("/api/chatbot/quick-order", methods=["POST"])
@login_required
def api_chatbot_quick_order():
    ensure_database_ready()
    user = current_user()
    payload = request.get_json(silent=True) or {}
    product_id = str(payload.get("product_id", "")).strip()
    delivery_type = str(payload.get("delivery_type", "pickup")).strip()

    if delivery_type not in {"pickup", "delivery"}:
        return jsonify({"ok": False, "error": "Tipo de entrega invalido."}), 400

    product = get_product(product_id)

    if not product:
        return jsonify({"ok": False, "error": "Producto no encontrado."}), 404

    try:
        order = create_order(
            user["id"],
            items=[{"product_id": product["id"], "quantity": 1}],
            delivery_type=delivery_type,
            source="chatbot",
        )
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    set_pending_chatbot_product(None)
    response = build_order_created_response(product, order, user)
    user_message = f"Quiero {'domicilio' if delivery_type == 'delivery' else 'pedido'} de {product['nombre']}"
    save_chat_message(
        user["id"],
        "user",
        user_message,
        metadata={
            "intent": "quick_order",
            "delivery_type": delivery_type,
            "product_id": product["id"],
        },
    )
    history = list_chat_messages(user["id"], limit=10)
    response = naturalize_chatbot_response(user, user_message, history, response)
    save_chat_message(
        user["id"],
        "bot",
        response["reply"],
        metadata=build_chatbot_message_metadata(response),
    )

    return jsonify({"ok": True, **response}), 201


@app.route("/api/chatbot/cart-checkout", methods=["POST"])
@login_required
def api_chatbot_cart_checkout():
    ensure_database_ready()
    user = current_user()
    payload = request.get_json(silent=True) or {}
    items = payload.get("items", [])
    delivery_type = str(payload.get("delivery_type", "pickup")).strip()
    user_message = str(payload.get("user_message", "")).strip()

    if delivery_type not in {"pickup", "delivery"}:
        return jsonify({"ok": False, "error": "Tipo de entrega invalido."}), 400

    if not items:
        return jsonify({"ok": False, "error": "No hay productos en el carrito."}), 400

    try:
        order = create_order(user["id"], items, delivery_type=delivery_type, source="chatbot")
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    if not user_message:
        user_message = (
            "Quiero pedir domicilio con mi carrito"
            if delivery_type == "delivery"
            else "Quiero crear un pedido con mi carrito"
        )

    set_pending_chatbot_product(None)
    save_chat_message(
        user["id"],
        "user",
        user_message,
        metadata={
            "intent": "cart_checkout",
            "delivery_type": delivery_type,
            "item_count": len(items),
        },
    )
    history = list_chat_messages(user["id"], limit=10)
    response = build_cart_order_created_response(order, len(items), delivery_type, user)
    response = naturalize_chatbot_response(user, user_message, history, response)
    save_chat_message(
        user["id"],
        "bot",
        response["reply"],
        metadata=build_chatbot_message_metadata(response),
    )

    return jsonify({"ok": True, **response}), 201


@app.route("/api/orders", methods=["POST"])
@login_required
def api_create_order():
    ensure_database_ready()
    user = current_user()
    payload = request.get_json(silent=True) or {}
    items = payload.get("items", [])
    delivery_type = payload.get("delivery_type", "pickup")
    notes = str(payload.get("notes", "")).strip()

    if delivery_type not in {"pickup", "delivery"}:
        return jsonify({"ok": False, "error": "Tipo de entrega invalido."}), 400

    try:
        order = create_order(
            user["id"],
            items,
            delivery_type=delivery_type,
            notes=notes,
            source="storefront",
        )
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    return jsonify(
        {
            "ok": True,
            "order": order,
            "whatsapp_url": build_order_whatsapp_url(user, order),
        }
    ), 201


if __name__ == "__main__":
    app.run(debug=True)
