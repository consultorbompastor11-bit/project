import { AlertCircle } from 'lucide-react';

interface AppErrorProps {
  message?: string;
  retry?: () => void;
}

export function AppError({ message = 'Ocorreu um erro inesperado', retry }: AppErrorProps) {
  return (
    <div className="bg-negative/5 border border-negative/20 rounded-lg p-6 flex flex-col items-center justify-center text-center">
      <AlertCircle className="h-12 w-12 text-negative mb-4" />
      <p className="text-lg font-medium text-gray-900 mb-2">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-4 px-4 py-2 bg-negative text-white rounded-lg hover:bg-negative/90 transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
