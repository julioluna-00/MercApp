import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Send, Mic, MicOff } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola! Soy tu asistente virtual. ¿En qué te puedo ayudar?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showQuickOptions, setShowQuickOptions] = useState(true);
  const recognitionRef = useRef<any>(null);

  const quickOptions = [
    { id: 1, text: '🔍 Quiero buscar producto', response: 'Perfecto, puedes buscar productos directamente en el catálogo usando el buscador en la parte superior. ¿Qué producto necesitas?' },
    { id: 2, text: '🛒 Quiero hacer pedido', response: 'Genial, para hacer tu pedido: 1) Agrega productos al carrito, 2) Ve al carrito, 3) Haz clic en "Hacer pedido". ¿Necesitas ayuda con algo específico?' },
    { id: 3, text: '🏠 Quiero pedir domicilio', response: 'Claro, para pedir domicilio: 1) Agrega productos al carrito, 2) Ve al carrito, 3) Haz clic en "Pedir domicilio". Recibirás tus productos en tu dirección registrada.' },
  ];

  const handleQuickOption = (option: typeof quickOptions[0]) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: option.text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setShowQuickOptions(false);

    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: option.response,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setShowQuickOptions(true);
    }, 800);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');
    setShowQuickOptions(false);

    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setShowQuickOptions(true);
    }, 800);
  };

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes('precio') || input.includes('costo') || input.includes('cuanto')) {
      return 'Puedes ver todos los precios de nuestros productos en el catálogo. ¿Hay algún producto específico del que quieras saber el precio?';
    }

    if (input.includes('envio') || input.includes('domicilio') || input.includes('entrega')) {
      return 'Ofrecemos servicio de domicilio. Puedes solicitarlo al momento de hacer tu pedido desde el carrito de compras.';
    }

    if (input.includes('pago') || input.includes('pagar')) {
      return 'Aceptamos diferentes métodos de pago. Al finalizar tu compra podrás elegir la opción que más te convenga.';
    }

    if (input.includes('producto') || input.includes('buscar') || input.includes('tienen')) {
      return 'Tenemos una gran variedad de productos disponibles. Puedes navegar por el catálogo o usar el buscador para encontrar lo que necesitas.';
    }

    if (input.includes('stock') || input.includes('disponible') || input.includes('hay')) {
      return 'La disponibilidad de cada producto se muestra en el catálogo. Si ves "Agotado" significa que temporalmente no tenemos stock.';
    }

    if (input.includes('horario') || input.includes('hora')) {
      return 'Nuestro servicio en línea está disponible las 24 horas. Los pedidos se procesan y entregan en horario comercial.';
    }

    if (input.includes('hola') || input.includes('buenos') || input.includes('buenas')) {
      return '¡Hola! ¿En qué puedo ayudarte hoy?';
    }

    if (input.includes('gracias')) {
      return '¡De nada! Si necesitas algo más, aquí estaré para ayudarte.';
    }

    return 'Entiendo. ¿Puedes darme más detalles sobre lo que necesitas? Estoy aquí para ayudarte con información sobre productos, precios, envíos y más.';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tu navegador no soporta reconocimiento de voz. Por favor usa Chrome o Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'es-ES';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-white rounded-full w-20 h-20 flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50 border-4 border-green-500 group"
        >
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-300 to-blue-400 rounded-full flex items-center justify-center">
                <div className="relative">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-blue-600 rounded-b-full"></div>
                </div>
              </div>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden border-4 border-green-500">
          <div className="bg-gradient-to-r from-green-500 via-green-600 to-green-500 text-white p-5 flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-300 to-blue-400 rounded-full flex items-center justify-center">
                    <div className="relative">
                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        </div>
                      </div>
                      <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-4 h-2 bg-blue-600 rounded-b-full"></div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full"></div>
              </div>
              <div>
                <h3 className="font-bold text-lg">Asistente Virtual</h3>
                <p className="text-sm text-green-100">En línea</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="hover:bg-white/30 bg-white/10 rounded-full p-3 transition-all cursor-pointer flex-shrink-0"
              type="button"
              aria-label="Cerrar chat"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-green-50/30 to-white h-96">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-5 py-3 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-md shadow-md'
                      : 'bg-white border-2 border-gray-100 text-gray-800 rounded-bl-md shadow-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p
                    className={`text-xs mt-1.5 ${
                      message.sender === 'user' ? 'text-green-100' : 'text-gray-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {showQuickOptions && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-gray-500 text-center mb-3">Opciones rápidas:</p>
                <div className="grid grid-cols-1 gap-2">
                  {quickOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleQuickOption(option)}
                      className="bg-white hover:bg-green-50 border-2 border-green-200 hover:border-green-400 text-gray-700 text-sm py-3 px-4 rounded-2xl transition-all shadow-sm hover:shadow-md text-left font-medium"
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t-2 border-gray-100">
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="flex-1 h-12 bg-gray-50 border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 rounded-full px-5"
              />
              <Button
                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                className={`rounded-full w-12 h-12 p-0 transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                onClick={handleSendMessage}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full w-12 h-12 p-0 shadow-lg"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
