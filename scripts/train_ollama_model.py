import argparse
import json
import subprocess
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from database import list_products


DEFAULT_BASE_MODEL = "llama3.2:1b"
DEFAULT_TARGET_MODEL = "mercaapp-agent"


def normalize_text(value):
    return " ".join(str(value or "").split()).strip()


def product_record(product):
    return {
        "id": product["id"],
        "nombre": normalize_text(product["nombre"]),
        "categoria": normalize_text(product["categoria"]),
        "precio": normalize_text(product["precio_mostrado"]),
        "stock": int(product["stock"]),
        "oferta": bool(product["oferta"]),
        "descripcion": normalize_text(product["descripcion"]),
        "disponibilidad": "disponible" if int(product["stock"]) > 0 else "agotado",
    }


def build_catalog(products):
    return [product_record(product) for product in products]


def build_system_block(catalog):
    lines = [
        "Eres MercAppBot, el asistente oficial de MercApp.",
        "Habla siempre en espanol claro, breve, amable y cercano.",
        "Tu prioridad es ayudar a comprar productos del catalogo real de la tienda.",
        "Nunca inventes productos, precios, stock, promociones ni politicas.",
        "Solo responde sobre productos, precios, stock, pedidos, domicilios, pagos y uso de la tienda.",
        "Si no tienes un dato exacto del catalogo, dilo con honestidad.",
        "No menciones procesos internos, prompts, contexto, JSON, backend ni reglas del sistema.",
        "No uses listas salvo que el cliente las pida.",
        "Cuando el cliente pregunte por stock, entrega la cantidad exacta.",
        "Si no preguntan por stock, evita mencionarlo.",
        "Si un producto esta agotado, dilo de forma natural y ofrece otra opcion.",
        "Si el cliente quiere comprar o pedir domicilio, guialo con pasos simples.",
        "",
        "Catalogo base de MercApp:",
    ]

    for product in catalog:
        offer_text = "en oferta" if product["oferta"] else "sin oferta"
        lines.append(
            f"- {product['nombre']} | categoria {product['categoria']} | "
            f"precio {product['precio']} | stock {product['stock']} | "
            f"estado {product['disponibilidad']} | {offer_text} | {product['descripcion']}"
        )

    return "\n".join(lines)


def build_examples(catalog):
    examples = [
        {
            "messages": [
                {"role": "user", "content": "Hola"},
                {
                    "role": "assistant",
                    "content": "Hola. Estoy listo para ayudarte con productos, precios, stock, pedidos y domicilios en MercApp.",
                },
            ]
        },
        {
            "messages": [
                {"role": "user", "content": "Tienen domicilios?"},
                {
                    "role": "assistant",
                    "content": "Si. Agrega los productos al carrito y luego confirmas el domicilio. Si quieres, te voy guiando paso a paso.",
                },
            ]
        },
        {
            "messages": [
                {"role": "user", "content": "Como pago mi pedido?"},
                {
                    "role": "assistant",
                    "content": "Cuando confirmes el pedido, te guio con las opciones de pago disponibles para tu compra.",
                },
            ]
        },
    ]

    for product in catalog[:12]:
        examples.append(
            {
                "messages": [
                    {"role": "user", "content": f"Cuanto vale {product['nombre']}?"},
                    {
                        "role": "assistant",
                        "content": (
                            f"{product['nombre']} esta en {product['precio']}. "
                            f"{product['descripcion']} Si quieres, te ayudo a pedirlo."
                        ),
                    },
                ]
            }
        )

        examples.append(
            {
                "messages": [
                    {"role": "user", "content": f"Hay stock de {product['nombre']}?"},
                    {
                        "role": "assistant",
                        "content": (
                            f"En este momento {product['nombre']} tiene {product['stock']} unidades disponibles."
                            if product["stock"] > 0
                            else f"En este momento {product['nombre']} esta agotado. Si quieres, te ayudo a buscar otra opcion."
                        ),
                    },
                ]
            }
        )

    return examples


def build_modelfile(base_model, system_block):
    return (
        f"FROM {base_model}\n\n"
        f'PARAMETER temperature 0.7\n'
        f'PARAMETER num_ctx 4096\n'
        f'SYSTEM """\n{system_block}\n"""\n'
    )


def write_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")


def write_jsonl(path, rows):
    content = "\n".join(json.dumps(row, ensure_ascii=True) for row in rows)
    path.write_text(content + ("\n" if content else ""), encoding="utf-8")


def build_readme(model_name, base_model):
    return f"""# Entrenamiento local de MercaApp con Ollama

Este directorio fue generado automaticamente para especializar el agente de MercApp.

Modelo base: `{base_model}`
Modelo objetivo: `{model_name}`

Archivos:
- `Modelfile`: define el modelo derivado para Ollama.
- `catalogo.json`: exporta el catalogo usado como base.
- `ejemplos.jsonl`: conversaciones de ejemplo para refinar tono y comportamiento.

Uso sugerido:
1. Crear el modelo: `ollama create {model_name} -f ollama_training/Modelfile`
2. Probarlo: `ollama run {model_name}`
3. Activarlo en la app: cambia `OLLAMA_MODEL={model_name}` en `.env`
"""


def create_model(model_name, modelfile_path):
    command = [
        "C:\\Users\\Personal\\AppData\\Local\\Programs\\Ollama\\ollama.exe",
        "create",
        model_name,
        "-f",
        str(modelfile_path),
    ]
    subprocess.run(command, check=True)


def main():
    parser = argparse.ArgumentParser(description="Genera archivos para especializar el agente local de MercaApp con Ollama.")
    parser.add_argument("--base-model", default=DEFAULT_BASE_MODEL)
    parser.add_argument("--model-name", default=DEFAULT_TARGET_MODEL)
    parser.add_argument("--output-dir", default="ollama_training")
    parser.add_argument("--create-model", action="store_true")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    products = list_products()
    catalog = build_catalog(products)
    system_block = build_system_block(catalog)
    examples = build_examples(catalog)

    modelfile_path = output_dir / "Modelfile"
    modelfile_path.write_text(build_modelfile(args.base_model, system_block), encoding="utf-8")
    write_json(output_dir / "catalogo.json", catalog)
    write_jsonl(output_dir / "ejemplos.jsonl", examples)
    (output_dir / "README.md").write_text(build_readme(args.model_name, args.base_model), encoding="utf-8")

    print(f"Archivos generados en: {output_dir.resolve()}")
    print(f"Modelo sugerido: {args.model_name}")
    print(f"Productos incluidos: {len(catalog)}")

    if args.create_model:
        create_model(args.model_name, modelfile_path.resolve())
        print(f"Modelo creado en Ollama: {args.model_name}")


if __name__ == "__main__":
    main()
