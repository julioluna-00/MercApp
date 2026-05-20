import { Button } from './ui/button';
import { ArrowLeft, User, Phone, MapPin, Mail } from 'lucide-react';

interface UserData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  address: string;
  isAdmin?: boolean;
}

interface ProfileProps {
  userData: UserData;
  onBack: () => void;
}

export default function Profile({ userData, onBack }: ProfileProps) {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-3xl mx-auto pt-8">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-green-500 text-green-600 hover:bg-green-50 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </Button>

        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-green-100">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-green-500 to-green-600 w-24 h-24 rounded-full flex items-center justify-center shadow-lg mb-4">
              <User className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">{userData.firstName} {userData.lastName}</h1>
            <p className="text-gray-500">@{userData.username}</p>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
              <div className="flex items-start gap-4">
                <div className="bg-green-500 p-3 rounded-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Nombre</p>
                  <p className="text-lg font-semibold text-gray-800">{userData.firstName}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500 p-3 rounded-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Apellidos</p>
                  <p className="text-lg font-semibold text-gray-800">{userData.lastName}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500 p-3 rounded-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Usuario</p>
                  <p className="text-lg font-semibold text-gray-800">{userData.username}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
              <div className="flex items-start gap-4">
                <div className="bg-green-500 p-3 rounded-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Teléfono</p>
                  <p className="text-lg font-semibold text-gray-800">{userData.phone || 'No registrado'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-white p-6 rounded-xl border border-green-200">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500 p-3 rounded-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Dirección</p>
                  <p className="text-lg font-semibold text-gray-800">{userData.address || 'No registrada'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg transition-all"
            >
              Editar Perfil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
