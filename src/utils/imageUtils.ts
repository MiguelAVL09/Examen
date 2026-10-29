// Utilidad para comprimir y procesar imágenes subidas por el usuario
// Convierte fotos pesadas (ej: 5MB-10MB) a un formato optimizado JPEG Data URL (~60KB - 120KB)
// para que se guarden sin problemas en LocalStorage y Supabase.

export async function processImageUpload(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 500,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Escalar manteniendo proporción
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }

        // Suavizado de imagen
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar como JPEG comprimido
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen seleccionada.'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo del dispositivo.'));
    };
  });
}

// Galería de imágenes de alta resolución predeterminadas listas para usar con 1 clic
export const PRESET_IMAGES = [
  {
    name: 'Espacio / Cosmos',
    url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=80',
    icon: '🪐',
  },
  {
    name: 'Tecnología / Código',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    icon: '💻',
  },
  {
    name: 'Historia / Pirámides',
    url: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&auto=format&fit=crop&q=80',
    icon: '🏛️',
  },
  {
    name: 'Naturaleza / Océano',
    url: 'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=800&auto=format&fit=crop&q=80',
    icon: '🌊',
  },
  {
    name: 'Montañas / Everest',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    icon: '🏔️',
  },
  {
    name: 'Ciencia / Laboratorio',
    url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
    icon: '🧪',
  },
];
