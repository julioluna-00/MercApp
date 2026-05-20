# Entrenamiento local de MercaApp con Ollama

Este directorio fue generado automaticamente para especializar el agente de MercApp.

Modelo base: `llama3.2:1b`
Modelo objetivo: `mercaapp-agent`

Archivos:
- `Modelfile`: define el modelo derivado para Ollama.
- `catalogo.json`: exporta el catalogo usado como base.
- `ejemplos.jsonl`: conversaciones de ejemplo para refinar tono y comportamiento.

Uso sugerido:
1. Crear el modelo: `ollama create mercaapp-agent -f ollama_training/Modelfile`
2. Probarlo: `ollama run mercaapp-agent`
3. Activarlo en la app: cambia `OLLAMA_MODEL=mercaapp-agent` en `.env`
