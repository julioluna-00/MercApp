import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from database import build_chatbot_response, list_products

DEFAULT_OPENAI_MODEL = "gpt-5.1"
DEFAULT_OLLAMA_MODEL = "llama3.2:1b"
DEFAULT_OLLAMA_URL = "http://localhost:11434"
STOCK_TERMS_RE = re.compile(r"\b(stock|unidades?|cantidad|disponibil(?:idad|es)?|inventario|quedan?)\b", re.IGNORECASE)
MONEY_RE = re.compile(r"\$\s?\d")
ORDER_TERMS_RE = re.compile(r"\b(pedido|domicilio|whatsapp|recoger|entrega|confirmar)\b", re.IGNORECASE)


def get_chatbot_provider():
    provider = os.getenv("CHATBOT_PROVIDER", "").strip().lower()

    if provider in {"ollama", "openai", "fallback"}:
        return provider

    if os.getenv("OLLAMA_MODEL") or os.getenv("OLLAMA_BASE_URL"):
        return "ollama"

    if os.getenv("OPENAI_API_KEY"):
        return "openai"

    return "fallback"


def openai_is_configured():
    return bool(os.getenv("OPENAI_API_KEY")) and OpenAI is not None


def get_openai_model():
    return (
        os.getenv("OPENAI_CHAT_MODEL", "").strip()
        or os.getenv("OPENAI_MODEL", "").strip()
        or DEFAULT_OPENAI_MODEL
    )


def get_ollama_model():
    return os.getenv("OLLAMA_MODEL", "").strip() or DEFAULT_OLLAMA_MODEL


def get_ollama_base_url():
    return os.getenv("OLLAMA_BASE_URL", "").strip() or DEFAULT_OLLAMA_URL


def ollama_is_configured():
    return bool(get_ollama_model()) and bool(get_ollama_base_url())


def _ollama_request(path, payload=None, timeout=20):
    base_url = get_ollama_base_url().rstrip("/") + "/"
    url = urljoin(base_url, path.lstrip("/"))
    body = None
    headers = {}

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(url, data=body, headers=headers, method="POST" if body else "GET")

    with urlopen(request, timeout=timeout) as response:
        content = response.read().decode("utf-8")
        return json.loads(content) if content else {}


def get_ollama_tags():
    try:
        payload = _ollama_request("/api/tags", timeout=5)
    except (URLError, HTTPError, TimeoutError, ValueError):
        return []

    return payload.get("models", []) or []


def _canonicalize_ollama_model_name(model_name):
    normalized = (model_name or "").strip()

    if not normalized:
        return ""

    if ":" in normalized:
        return normalized

    return f"{normalized}:latest"


def ollama_is_available():
    if not ollama_is_configured():
        return False

    tags = get_ollama_tags()

    if not tags:
        return False

    model_name = get_ollama_model()
    canonical_model_name = _canonicalize_ollama_model_name(model_name)
    available = {item.get("name", "") for item in tags}
    return model_name in available or canonical_model_name in available


def get_chatbot_status():
    provider = get_chatbot_provider()

    if provider == "ollama":
        configured = ollama_is_available()
        model = get_ollama_model()
        label = f"Ollama activo - {model}" if configured else "Ollama no disponible - modo local"
        return {
            "provider": provider,
            "configured": configured,
            "model": model,
            "label": label,
        }

    if provider == "openai":
        configured = openai_is_configured()
        model = get_openai_model()
        label = f"OpenAI activo - {model}" if configured else "OpenAI no configurado - modo local"
        return {
            "provider": provider,
            "configured": configured,
            "model": model,
            "label": label,
        }

    return {
        "provider": "fallback",
        "configured": False,
        "model": "",
        "label": "En linea - modo local",
    }


def provider_is_ready(provider):
    if provider == "ollama":
        return ollama_is_available()
    if provider == "openai":
        return openai_is_configured()
    return False


def serialize_catalog(products, limit=10):
    lines = []

    for product in products[:limit]:
        availability = "disponible" if product["stock"] > 0 else "agotado"
        offer_text = "en oferta" if product["oferta"] else "sin oferta"
        lines.append(
            (
                f"- {product['nombre']} | precio {product['precio_mostrado']} | "
                f"categoria {product['categoria']} | stock {product['stock']} | "
                f"estado {availability} | {offer_text} | {product['descripcion']}"
            )
        )

    return "\n".join(lines)


def find_product_by_id(products, product_id):
    if not product_id:
        return None

    product_id = str(product_id)

    for product in products:
        if str(product["id"]) == product_id:
            return product

    return None


def build_operational_context(fallback, products):
    action = fallback.get("action") or ""
    product = find_product_by_id(products, fallback.get("product_id"))
    show_stock = bool(fallback.get("show_stock"))
    lines = [
        "Contexto operativo del sistema:",
        f"- Accion detectada: {action or 'sin accion especial'}",
    ]

    if fallback.get("search_term"):
        lines.append(f"- Termino relacionado: {fallback['search_term']}")

    if product:
        availability = "disponible" if product["stock"] > 0 else "agotado"
        lines.extend(
            [
                f"- Producto detectado: {product['nombre']}",
                f"- Precio exacto: {product['precio_mostrado']}",
                f"- Estado exacto: {availability}",
                f"- Descripcion exacta: {product['descripcion']}",
            ]
        )
        if show_stock or product["stock"] <= 0:
            lines.append(f"- Stock exacto: {product['stock']}")

    order = fallback.get("order") or {}
    if order:
        delivery_label = "domicilio" if order.get("delivery_type") == "delivery" else "pedido para recoger"
        lines.extend(
            [
                f"- Pedido confirmado: #{order.get('id', '')}",
                f"- Tipo de cierre: {delivery_label}",
                f"- Total exacto: {order.get('total_mostrado', '')}",
                "- El cierre y la confirmacion final se hacen por WhatsApp.",
                "- No se aceptan pagos con tarjeta desde el chat.",
            ]
        )

    if action == "show_product_options" and product and product["stock"] > 0:
        if show_stock:
            lines.append(
                "- Debes confirmar el producto de forma natural, mencionar precio y stock exactos, "
                "y cerrar preguntando si desea pedido o domicilio."
            )
        else:
            lines.append(
                "- Debes confirmar el producto de forma natural, mencionar precio exacto y descripcion, "
                "pero no menciones el stock salvo que el cliente lo haya pedido."
            )
    elif action == "open_search" and product and product["stock"] <= 0:
        lines.append(
            "- Explica con naturalidad que el producto existe pero esta agotado y ofrece buscar otra opcion."
        )
    elif action == "open_search":
        lines.append("- Si no hay coincidencia exacta, dilo con honestidad y guia la busqueda.")
    elif action == "open_cart":
        lines.append("- El usuario quiere avanzar con compra o domicilio; guialo con tono cercano.")
        lines.append("- Si preguntan por pago, aclara que la confirmacion va por WhatsApp y no se acepta tarjeta.")
    elif action == "refresh_catalog" and order:
        lines.append("- Confirma el pedido con tono cercano y explica que ahora sigue la confirmacion por WhatsApp.")

    lines.append(
        "- No menciones nombres internos como accion, JSON, backend, fallback o sistema."
    )
    return "\n".join(lines)


def build_system_prompt(user, products, fallback):
    user_name = user.get("full_name") or user.get("username") or "cliente"
    catalog_text = serialize_catalog(products)
    operational_context = build_operational_context(fallback, products)

    return (
        "Eres MercAppBot, el asistente virtual oficial de MercApp.\n"
        "Habla siempre en espanol claro, natural, amable y cercano.\n"
        "Tu estilo debe parecer el de un asesor humano real, no un bot rigido.\n"
        "Puedes tener charla cotidiana breve como saludo, agradecimiento o una respuesta amable, pero siempre debes volver al contexto de supermercado.\n"
        "No hables de temas fuera de compras, productos, pedidos, domicilios, pagos, horarios y uso de la tienda.\n"
        "Si el cliente intenta salir del tema, responde con amabilidad y redirige la conversacion a la tienda.\n"
        "Evita sonar monotono o repetitivo y manten respuestas breves, utiles y rapidas de leer.\n"
        "Puedes hacer una sola pregunta corta para continuar la conversacion cuando sea util.\n"
        "Solo puedes ayudar con productos, precios, stock, pedidos, domicilios, pagos y uso de la tienda.\n"
        "No inventes productos, precios, stock ni promociones.\n"
        "Usa siempre los datos exactos del catalogo y del contexto operativo.\n"
        "Si se habla de stock, menciona la cantidad exacta disponible cuando exista.\n"
        "No menciones stock, unidades, cantidad, disponibilidad o inventario salvo que el cliente lo pida de forma explicita.\n"
        "Si el producto esta agotado, no ofrezcas pedido de ese producto y sugiere buscar otra opcion.\n"
        "Los pedidos y domicilios se confirman por WhatsApp.\n"
        "No se aceptan pagos con tarjeta desde este flujo.\n"
        "Si preguntan por el pago, explica que despues del resumen se continua por WhatsApp.\n"
        "No uses listas salvo que el usuario las pida; responde como conversacion.\n"
        f"Cliente actual: {user_name}.\n"
        f"{operational_context}\n"
        "Catalogo disponible:\n"
        f"{catalog_text}"
    )


def build_provider_messages(system_prompt, history, current_message):
    messages = [{"role": "system", "content": system_prompt}]

    for item in history[-6:]:
        role = "assistant" if item["role"] == "bot" else "user"
        messages.append({"role": role, "content": item["message"]})

    # El mensaje actual ya puede venir incluido en el historial porque se guarda
    # antes de llamar al proveedor. Evitamos duplicarlo para no confundir al modelo.
    if not messages or messages[-1]["role"] != "user" or messages[-1]["content"].strip() != current_message.strip():
        messages.append({"role": "user", "content": current_message})
    return messages


def generate_openai_reply(messages):
    if not openai_is_configured():
        return ""

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.responses.create(
        model=get_openai_model(),
        input=messages,
        store=False,
        temperature=0.9,
        reasoning={"effort": "low"},
        max_output_tokens=260,
    )

    return (response.output_text or "").strip()


def generate_ollama_reply(messages):
    if not ollama_is_available():
        return ""

    payload = {
        "model": get_ollama_model(),
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.45,
            "top_p": 0.9,
            "num_predict": 160,
            "num_ctx": 3072,
        },
    }

    response = _ollama_request("/api/chat", payload=payload, timeout=35)
    return ((response.get("message") or {}).get("content") or "").strip()


def call_model_provider(provider, messages):
    if provider == "ollama":
        return generate_ollama_reply(messages)

    if provider == "openai":
        return generate_openai_reply(messages)

    return ""


def generated_reply_supports_context(reply, response_context, products=None):
    if not reply:
        return False

    normalized_reply = reply.lower()
    product_name = (response_context.get("product_name") or "").strip().lower()
    price_display = (response_context.get("price_display") or "").strip().lower()
    action = response_context.get("action") or ""

    if product_name and action == "show_product_options":
        has_product_name = product_name in normalized_reply
        has_price = price_display and price_display in normalized_reply

        if not (has_product_name or has_price):
            return False

        other_product_names = [
            (product.get("nombre") or "").strip().lower()
            for product in (products or [])
            if (product.get("nombre") or "").strip().lower() not in {"", product_name}
        ]

        if any(other_name in normalized_reply for other_name in other_product_names):
            return False

    if action == "open_cart" and not response_context.get("product_id") and not response_context.get("order"):
        if MONEY_RE.search(reply):
            return False

    if action == "refresh_catalog" and response_context.get("order"):
        normalized = normalized_reply
        if "whatsapp" not in normalized:
            return False
        if "tarjeta" in normalized and "no" not in normalized:
            return False

    return True


def sanitize_generated_reply(reply, response_context):
    if not reply:
        return reply

    if response_context.get("show_stock"):
        return reply.strip()

    if response_context.get("action") != "show_product_options":
        return reply.strip()

    cleaned_parts = []
    for part in re.split(r"(?<=[.!?])\s+|\n+", reply.strip()):
        snippet = part.strip()
        if not snippet:
            continue
        if STOCK_TERMS_RE.search(snippet):
            continue
        cleaned_parts.append(snippet)

    cleaned_reply = " ".join(cleaned_parts).strip()
    cleaned_reply = re.sub(r"\s{2,}", " ", cleaned_reply)

    product_name = (response_context.get("product_name") or "").strip()
    price_display = (response_context.get("price_display") or "").strip()
    product_description = (response_context.get("product_description") or "").strip()

    if cleaned_reply and (not product_name or product_name.lower() in cleaned_reply.lower()):
        return cleaned_reply

    if product_name and price_display:
        fallback_reply = f"Te encontre {product_name}. Su precio actual es {price_display}."
        if product_description:
            fallback_reply += f" {product_description}"
        fallback_reply += " Si quieres, te ayudo a realizar un pedido o a pedir domicilio."
        return fallback_reply

    return reply.strip()


def build_agent_unavailable_response(provider):
    label = "Ollama" if provider == "ollama" else "OpenAI" if provider == "openai" else "agente inteligente"
    return {
        "reply": f"Ahora mismo el agente inteligente no pudo responder desde {label}. Intenta de nuevo en unos segundos.",
        "action": None,
        "search_term": "",
        "product_id": None,
        "product_name": None,
        "price_display": None,
        "product_stock": None,
        "image_path": None,
        "options": [],
        "order": None,
        "item_count": None,
        "whatsapp_url": None,
        "source": "agent_unavailable",
        "model": get_ollama_model() if provider == "ollama" else get_openai_model() if provider == "openai" else "",
        "provider": provider or "unknown",
    }


def build_structured_provider_response(response_context, provider="structured"):
    return {
        **response_context,
        "source": provider,
        "model": "",
        "provider": provider,
    }


def should_prefer_structured_reply(response_context):
    if not response_context:
        return False

    action = response_context.get("action")
    has_product = bool(response_context.get("product_id"))
    has_order = bool(response_context.get("order"))
    has_reply = bool((response_context.get("reply") or "").strip())

    if not has_reply:
        return False

    if has_order:
        return True

    if action == "show_product_options" and has_product:
        return False

    if action == "open_search" and has_product:
        return False

    if action in {None, "", "open_cart", "open_search"}:
        return True

    return False


def build_safe_operational_response(response_context):
    action = response_context.get("action")

    if should_prefer_structured_reply(response_context):
        return build_structured_provider_response(response_context)

    if action == "show_product_options" and response_context.get("product_name"):
        return build_structured_provider_response(response_context)

    if action == "refresh_catalog" and response_context.get("order"):
        return build_structured_provider_response(response_context)

    if action == "open_cart" and not response_context.get("product_id") and not response_context.get("order"):
        return {
            "reply": (
                "Puedo ayudarte con el pedido o el domicilio, pero primero necesito productos reales del catalogo. "
                "Escribeme el nombre exacto de un producto o agregalo al carrito y luego te ayudo a continuar."
            ),
            "action": "open_search",
            "search_term": "",
            "product_id": None,
            "product_name": None,
            "product_description": None,
            "price_display": None,
            "product_stock": None,
            "show_stock": False,
            "image_path": None,
            "options": response_context.get("options") or [],
            "order": None,
            "item_count": None,
            "whatsapp_url": None,
            "source": "structured",
            "model": "",
            "provider": "structured",
        }

    return None


def naturalize_chatbot_response(user, message, history, response_context):
    provider = get_chatbot_provider()

    if provider == "fallback":
        return build_agent_unavailable_response(provider)

    if not provider_is_ready(provider):
        return build_agent_unavailable_response(provider)

    safe_response = build_safe_operational_response(response_context)
    if safe_response:
        return safe_response

    products = list_products()
    system_prompt = build_system_prompt(user, products, response_context)
    messages = build_provider_messages(system_prompt, history, message)

    try:
        reply = call_model_provider(provider, messages)
    except Exception as error:
        print("CHATBOT PROVIDER ERROR:", error)
        if response_context.get("reply"):
            return build_structured_provider_response(response_context, "structured_fallback")
        reply = ""

    reply = sanitize_generated_reply(reply, response_context)

    if not generated_reply_supports_context(reply, response_context, products):
        if response_context.get("show_stock"):
            return {
                **response_context,
                "source": "structured",
                "provider": provider,
                "model": get_ollama_model() if provider == "ollama" else get_openai_model() if provider == "openai" else "",
            }
        if response_context.get("reply"):
            return build_structured_provider_response(response_context, "structured_fallback")
        return build_agent_unavailable_response(provider)

    model = get_ollama_model() if provider == "ollama" else get_openai_model()
    return {
        "reply": reply,
        "action": response_context.get("action"),
        "search_term": response_context.get("search_term"),
        "product_id": response_context.get("product_id"),
        "product_name": response_context.get("product_name"),
        "product_description": response_context.get("product_description"),
        "price_display": response_context.get("price_display"),
        "product_stock": response_context.get("product_stock"),
        "show_stock": response_context.get("show_stock"),
        "image_path": response_context.get("image_path"),
        "options": response_context.get("options"),
        "order": response_context.get("order"),
        "item_count": response_context.get("item_count"),
        "whatsapp_url": response_context.get("whatsapp_url"),
        "source": provider,
        "model": model,
        "provider": provider,
    }


def generate_chatbot_response(user, message, history):
    fallback = build_chatbot_response(message)
    return naturalize_chatbot_response(user, message, history, fallback)
