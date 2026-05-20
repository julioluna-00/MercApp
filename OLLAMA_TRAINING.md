# Entrenar el agente de MercaApp con Ollama

Tu app ya usa Ollama, pero hoy el agente no esta afinado con un modelo propio: usa `llama3.2:1b` mas un prompt y el catalogo actual.

Para especializarlo de forma local:

1. Genera los archivos de entrenamiento:
```powershell
python scripts/train_ollama_model.py
```

2. Crea el modelo derivado en Ollama:
```powershell
& 'C:\Users\Personal\AppData\Local\Programs\Ollama\ollama.exe' create mercaapp-agent -f ollama_training/Modelfile
```

3. Activa el modelo en tu app editando `.env`:
```env
OLLAMA_MODEL=mercaapp-agent
```

4. Reinicia la app y verifica `/api/chatbot/status`.

Que genera el script:
- `ollama_training/Modelfile`
- `ollama_training/catalogo.json`
- `ollama_training/ejemplos.jsonl`
- `ollama_training/README.md`

Importante:
- Esto no reentrena pesos desde cero. En Ollama, para este caso practico, lo correcto es crear un modelo derivado con reglas y conocimiento de negocio.
- Si luego cambias productos o precios, vuelve a ejecutar el script y recrea el modelo.
