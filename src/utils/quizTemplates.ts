import type { Quiz, Question, QuizKind } from '../types/quiz';
import { generateUUID } from '../services/quizService';

export interface QuizTemplateDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  coverImage: string;
  quizKind?: QuizKind;
  isAnonymousSurvey?: boolean;
  questions: Omit<Question, 'id' | 'quizId'>[];
}

export const CINEPOLIS_QUIZ_TEMPLATES: QuizTemplateDefinition[] = [
  {
    id: 'template-hospitalidad-vip',
    name: 'Hospitalidad y Servicio al Cliente Cinépolis',
    category: 'Servicio y Hospitalidad',
    description: 'Protocolos de atención cálida, estándares de saludo, resolución empática de quejas y hospitalidad en salas.',
    coverImage: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
    questions: [
      {
        questionText: '¿Cuál es el primer paso obligatorio del protocolo al recibir a un cliente en cualquier punto de contacto?',
        questionType: 'multiple_choice',
        timeLimit: 20,
        pointsMultiplier: 1,
        explanation: 'El contacto visual acompañado de una sonrisa y saludo institucional inmediato ("¡Hola, bienvenido a Cinépolis!") establece la conexión de calidez desde el primer segundo.',
        options: [
          { id: '1', text: 'Contacto visual inmediato con sonrisa y saludo de bienvenida cálido', isCorrect: true, color: 'red', shape: 'triangle', orderIndex: 0 },
          { id: '2', text: 'Esperar a que el cliente hable primero para no interrumpirlo', isCorrect: false, color: 'blue', shape: 'diamond', orderIndex: 1 },
          { id: '3', text: 'Solicitarle su boleto o membresía antes de saludarlo', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 2 },
          { id: '4', text: 'Comentarle las promociones vigentes de inmediato', isCorrect: false, color: 'green', shape: 'square', orderIndex: 3 },
        ],
      },
      {
        questionText: 'Si un cliente expresa insatisfacción con su experiencia o producto, la actitud correcta es:',
        questionType: 'multiple_choice',
        timeLimit: 20,
        pointsMultiplier: 1,
        explanation: 'En Cinépolis practicamos la escucha activa con empatía, sin confrontar al cliente, y ofrecemos una solución o reemplazo inmediato informando al supervisor.',
        options: [
          { id: '1', text: 'Escuchar con empatía sin discutir y ofrecer una solución ágil inmediata', isCorrect: true, color: 'blue', shape: 'diamond', orderIndex: 0 },
          { id: '2', text: 'Explicarle las políticas del cine para demostrar que no fue error nuestro', isCorrect: false, color: 'red', shape: 'triangle', orderIndex: 1 },
          { id: '3', text: 'Pedirle que escriba un correo a corporativo para su reembolso', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 2 },
          { id: '4', text: 'Ignorar el comentario si hay fila de otros clientes esperando', isCorrect: false, color: 'green', shape: 'square', orderIndex: 3 },
        ],
      },
      {
        questionText: 'En Cinépolis VIP y Tradicional, despedir al cliente deseándole que disfrute su película es opcional.',
        questionType: 'true_false',
        timeLimit: 15,
        pointsMultiplier: 1,
        explanation: 'Falso: la frase de cierre y buenos deseos ("¡Que disfrute mucho su función!") es parte del estándar de servicio integral.',
        options: [
          { id: '1', text: 'FALSO', isCorrect: true, color: 'blue', shape: 'diamond', orderIndex: 0 },
          { id: '2', text: 'VERDADERO', isCorrect: false, color: 'red', shape: 'triangle', orderIndex: 1 },
        ],
      },
      {
        questionText: 'Ordena la secuencia correcta del ciclo de servicio en mostrador de Dulcería:',
        questionType: 'puzzle',
        timeLimit: 30,
        pointsMultiplier: 1.5,
        explanation: 'El ciclo estándar es: 1. Saludo cálido -> 2. Toma de pedido con sugerencia -> 3. Preparación rápida y limpia -> 4. Cobro y despedida cordial.',
        options: [
          { id: '1', text: '1° Saludo de bienvenida con contacto visual', isCorrect: true, color: 'red', shape: 'triangle', orderIndex: 0 },
          { id: '2', text: '2° Toma de orden con sugerencia adicional', isCorrect: true, color: 'blue', shape: 'diamond', orderIndex: 1 },
          { id: '3', text: '3° Entrega cuidada y presentación del producto', isCorrect: true, color: 'yellow', shape: 'circle', orderIndex: 2 },
          { id: '4', text: '4° Cobro transparente y agradecimiento final', isCorrect: true, color: 'green', shape: 'square', orderIndex: 3 },
        ],
      },
    ],
  },
  {
    id: 'template-higiene-alimentos',
    name: 'Inocuidad y Seguridad Alimentaria (Dulcería y Cocina)',
    category: 'Calidad e Higiene',
    description: 'Protocolos de lavado de manos, manejo seguro de alimentos, rotación PEPS y limpieza de equipos.',
    coverImage: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=800&auto=format&fit=crop&q=80',
    questions: [
      {
        questionText: '¿Cuál es el tiempo mínimo recomendado para el lavado correcto de manos con agua y jabón antibacterial?',
        questionType: 'multiple_choice',
        timeLimit: 20,
        pointsMultiplier: 1,
        explanation: 'El frotado minucioso de palmas, dorso, entre dedos y uñas debe durar al menos 20 segundos para asegurar la desinfección efectiva.',
        options: [
          { id: '1', text: 'Al menos 20 segundos', isCorrect: true, color: 'green', shape: 'square', orderIndex: 0 },
          { id: '2', text: '5 segundos rápidos', isCorrect: false, color: 'red', shape: 'triangle', orderIndex: 1 },
          { id: '3', text: 'Solo enjuagarse con agua si no se tocaron residuos', isCorrect: false, color: 'blue', shape: 'diamond', orderIndex: 2 },
          { id: '4', text: '1 minuto completo sin jabón', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 3 },
        ],
      },
      {
        questionText: 'El principio PEPS para la rotación de insumos en bodega y dulcería significa:',
        questionType: 'multiple_choice',
        timeLimit: 20,
        pointsMultiplier: 1,
        explanation: 'PEPS (Primeras Entradas, Primeras Salidas) garantiza que los insumos con mayor tiempo en almacén se utilicen primero para evitar mermas y caducidades.',
        options: [
          { id: '1', text: 'Primeras Entradas, Primeras Salidas', isCorrect: true, color: 'blue', shape: 'diamond', orderIndex: 0 },
          { id: '2', text: 'Productos Especiales Para Salas', isCorrect: false, color: 'red', shape: 'triangle', orderIndex: 1 },
          { id: '3', text: 'Palomitas Estándar Para Selección', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 2 },
          { id: '4', text: 'Plan de Entrega Periódica Semanal', isCorrect: false, color: 'green', shape: 'square', orderIndex: 3 },
        ],
      },
      {
        questionText: 'Es permitido manipular ingredientes de alimentos listos para consumo sin guantes limpios o pinzas higienizadas.',
        questionType: 'true_false',
        timeLimit: 15,
        pointsMultiplier: 1,
        explanation: 'Falso: el contacto directo de manos con alimentos listos para servir está estrictamente prohibido por normas de sanidad.',
        options: [
          { id: '1', text: 'FALSO', isCorrect: true, color: 'blue', shape: 'diamond', orderIndex: 0 },
          { id: '2', text: 'VERDADERO', isCorrect: false, color: 'red', shape: 'triangle', orderIndex: 1 },
        ],
      },
    ],
  },
  {
    id: 'template-taquilla-operacion',
    name: 'Operación de Taquilla, Kioscos y Boletos Digitales',
    category: 'Operaciones de Cine',
    description: 'Cobro ágil, lectura de códigos QR, redención de promociones y manejo de incidencias de boletaje.',
    coverImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    questions: [
      {
        questionText: 'Al escanear un boleto digital en el acceso a salas, el escáner emite sonido de error. La primera acción correcta es:',
        questionType: 'multiple_choice',
        timeLimit: 20,
        pointsMultiplier: 1,
        explanation: 'Verificar fecha, conjunto, hora y sala en la pantalla del celular del cliente antes de asumir cualquier fallo.',
        options: [
          { id: '1', text: 'Verificar amablemente en la pantalla del cliente la fecha, cine y función', isCorrect: true, color: 'yellow', shape: 'circle', orderIndex: 0 },
          { id: '2', text: 'Rechazar la entrada de inmediato y enviarlo al final de la taquilla', isCorrect: false, color: 'red', shape: 'triangle', orderIndex: 1 },
          { id: '3', text: 'Permitirle el paso sin revisar para no generar retrasos', isCorrect: false, color: 'blue', shape: 'diamond', orderIndex: 2 },
          { id: '4', text: 'Retener el dispositivo móvil del cliente', isCorrect: false, color: 'green', shape: 'square', orderIndex: 3 },
        ],
      },
      {
        questionText: '¿Qué información clave se le debe confirmar en voz alta al cliente al entregarle boletos impresos en taquilla?',
        questionType: 'multiple_choice',
        timeLimit: 20,
        pointsMultiplier: 1,
        explanation: 'Confirmar película, horario, sala y número de butacas evita confusiones y garantiza la satisfacción del cliente.',
        options: [
          { id: '1', text: 'Película, horario, número de sala y asientos asignados', isCorrect: true, color: 'red', shape: 'triangle', orderIndex: 0 },
          { id: '2', text: 'Únicamente el precio total cobrado', isCorrect: false, color: 'blue', shape: 'diamond', orderIndex: 1 },
          { id: '3', text: 'El nombre del gerente en turno', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 2 },
          { id: '4', text: 'La duración exacta de los avances comerciales', isCorrect: false, color: 'green', shape: 'square', orderIndex: 3 },
        ],
      },
    ],
  },
  {
    id: 'template-imagen-sala',
    name: 'Imagen de Sala, Proyección y Limpieza Rápida',
    category: 'Operaciones de Sala',
    description: 'Revisión de sala entre funciones, inspección de audio y proyección, confort y limpieza profunda.',
    coverImage: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
    questions: [
      {
        questionText: '¿Cuál es el tiempo objetivo máximo para la limpieza exprés de sala entre el término de una función y el ingreso de la siguiente?',
        questionType: 'multiple_choice',
        timeLimit: 20,
        pointsMultiplier: 1,
        explanation: 'La limpieza entre funciones está optimizada para realizarse en un rango promedio de 5 a 8 minutos con el equipo de staff coordinado.',
        options: [
          { id: '1', text: 'De 5 a 8 minutos en equipo coordinado', isCorrect: true, color: 'green', shape: 'square', orderIndex: 0 },
          { id: '2', text: 'Más de 30 minutos', isCorrect: false, color: 'red', shape: 'triangle', orderIndex: 1 },
          { id: '3', text: 'Solo 30 segundos barriendo el pasillo central', isCorrect: false, color: 'blue', shape: 'diamond', orderIndex: 2 },
          { id: '4', text: 'No se realiza limpieza si la función anterior tuvo pocos asistentes', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 3 },
        ],
      },
      {
        questionText: 'Si durante los primeros 3 minutos de película se detecta desfase de audio o imagen borrosa, se debe avisar inmediatamente a:',
        questionType: 'multiple_choice',
        timeLimit: 15,
        pointsMultiplier: 1,
        explanation: 'Avisar a cabina de proyección / encargado técnico y al supervisor en turno de inmediato para calibrar sin interrumpir la función.',
        options: [
          { id: '1', text: 'Encargado de proyección y supervisor en turno', isCorrect: true, color: 'blue', shape: 'diamond', orderIndex: 0 },
          { id: '2', text: 'Esperar a que termine la película para reportarlo en bitácora', isCorrect: false, color: 'red', shape: 'triangle', orderIndex: 1 },
          { id: '3', text: 'Apagar el proyector sin avisar a nadie', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 2 },
          { id: '4', text: 'Preguntar a los clientes si les molesta el desfase', isCorrect: false, color: 'green', shape: 'square', orderIndex: 3 },
        ],
      },
    ],
  },
  {
    id: 'template-simulador-hospitalidad',
    name: 'Simulador de Casos: Atención al Cliente y Resolución de Conflictos',
    category: 'Simulador de Casos',
    description: 'Entrenamiento interactivo con toma de decisiones en situaciones críticas de dulcería, taquilla y salas.',
    coverImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    quizKind: 'simulator',
    questions: [
      {
        questionText: 'SITUACIÓN EN DULCERÍA: Es viernes a las 8:00 PM, fila de 10 personas. Un cliente reclama muy molesto que su refresco no tiene gas y su función empieza en 2 minutos. ¿Qué decisión tomas?',
        questionType: 'scenario',
        timeLimit: 30,
        pointsMultiplier: 1,
        scenarioContext: 'Horario estelar de dulcería. Fila concurrida y cliente con prisa y visible molestia.',
        options: [
          {
            id: '1',
            text: 'Ofrecer una disculpa sincera con empatía, cambiarle el vaso de inmediato por uno de otra máquina en menos de 20 segundos y desearle una excelente función.',
            isCorrect: true,
            color: 'blue',
            shape: 'diamond',
            scenarioFeedback: '🎬 CONSECUENCIA EXITOSA: El cliente se tranquilizó al ver tu rapidez y amabilidad, entró feliz a su sala y felicitó al equipo al salir. Resolviste el problema en 20 segundos sin crear cuellos de botella.',
          },
          {
            id: '2',
            text: 'Explicarle que el gas de la máquina fue calibrado por la mañana y que probablemente es su percepción.',
            isCorrect: false,
            color: 'red',
            shape: 'triangle',
            scenarioFeedback: '❌ CONSECUENCIA DE CONFLICTO: El cliente se molestó aún más, alzó la voz frente a los demás clientes y exigió ver al gerente de turno, retrasando la fila 6 minutos.',
          },
          {
            id: '3',
            text: 'Pedirle que espere mientras vas a bodega a verificar si hay jarabe disponible.',
            isCorrect: false,
            color: 'yellow',
            shape: 'circle',
            scenarioFeedback: '⚠️ CONSECUENCIA DE FRICCIÓN: El cliente perdió el inicio de su película por la demora y se marchó inconforme.',
          },
        ],
      },
      {
        questionText: 'SITUACIÓN EN ACCESO: Un cliente con boleto Tradicional insiste en ingresar a la sala MacroXE asegurando que el cajero le prometió esa sala. La sala MacroXE está al 95% de aforo. ¿Qué decisión tomas?',
        questionType: 'scenario',
        timeLimit: 30,
        pointsMultiplier: 1,
        scenarioContext: 'Punto de control de boletos. El cliente asegura un error en taquilla.',
        options: [
          {
            id: '1',
            text: 'Explicarle con cortesía la diferencia de sala y llamar de inmediato al supervisor por radio para verificar el cobro en taquilla sin obstruir el paso de los demás invitados.',
            isCorrect: true,
            color: 'green',
            shape: 'square',
            scenarioFeedback: '🎬 CONSECUENCIA EXITOSA: El supervisor atendió el caso en 1 minuto, el flujo de acceso continuó fluido y el cliente recibió una solución clara y transparente.',
          },
          {
            id: '2',
            text: 'Negarle el paso de forma tajante y decirle que debe volver a formarse en taquilla.',
            isCorrect: false,
            color: 'red',
            shape: 'triangle',
            scenarioFeedback: '❌ CONSECUENCIA DE CONFLICTO: El cliente se sintió maltratado, comenzó a grabar con su celular y generó un conato de reclamo en el lobby.',
          },
          {
            id: '3',
            text: 'Dejarlo pasar a MacroXE sin boleto válido para evitar discutir.',
            isCorrect: false,
            color: 'yellow',
            shape: 'circle',
            scenarioFeedback: '❌ CONSECUENCIA OPERATIVA: Se generó una duplicidad de butaca dentro de la sala a oscuras, interrumpiendo la experiencia de otros clientes.',
          },
        ],
      },
    ],
  },
  {
    id: 'template-clima-laboral',
    name: 'Encuesta de Clima Laboral y Voz del Colaborador (100% Anónima)',
    category: 'Voz del Colaborador',
    description: 'Diagnóstico anónimo y confidencial sobre ambiente de trabajo, liderazgo de supervisores y herramientas del cine.',
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    quizKind: 'survey',
    isAnonymousSurvey: true,
    questions: [
      {
        questionText: '¿Qué tan respaldado, escuchado y motivado te sientes por tus supervisores y gerencia de este cine en tu día a día?',
        questionType: 'survey_rating',
        timeLimit: 0,
        pointsMultiplier: 0,
        explanation: 'Tu respuesta es 100% anónima. Nos ayuda a fortalecer el liderazgo del equipo directivo.',
        options: [
          { id: '1', text: '1 - Muy insatisfecho / Sin apoyo', isCorrect: true, color: 'red', shape: 'triangle' },
          { id: '2', text: '2 - Poco apoyado', isCorrect: true, color: 'blue', shape: 'diamond' },
          { id: '3', text: '3 - Regular / Neutro', isCorrect: true, color: 'yellow', shape: 'circle' },
          { id: '4', text: '4 - Bien respaldado', isCorrect: true, color: 'green', shape: 'square' },
        ],
      },
      {
        questionText: '¿Consideras que el ambiente de trabajo y compañerismo en tu área (Taquilla, Dulcería, Staff, Alimentos) es positivo y colaborativo?',
        questionType: 'survey_rating',
        timeLimit: 0,
        pointsMultiplier: 0,
        explanation: 'Tu retroalimentación impulsa la armonía y el trabajo en equipo en nuestros turnos.',
        options: [
          { id: '1', text: '1 - Hay mucha tensión o conflicto', isCorrect: true, color: 'red', shape: 'triangle' },
          { id: '2', text: '2 - Falta más unión', isCorrect: true, color: 'blue', shape: 'diamond' },
          { id: '3', text: '3 - Ambiente normal', isCorrect: true, color: 'yellow', shape: 'circle' },
          { id: '4', text: '4 - Muy buen compañerismo y respeto', isCorrect: true, color: 'green', shape: 'square' },
        ],
      },
      {
        questionText: '¿Cuentas con los insumos, herramientas, uniformes e instalaciones de descanso adecuadas para realizar tu turno?',
        questionType: 'survey_rating',
        timeLimit: 0,
        pointsMultiplier: 0,
        explanation: 'Identificamos necesidades de insumos y mantenimiento para tus áreas de trabajo.',
        options: [
          { id: '1', text: '1 - Faltan insumos esenciales frecuentemente', isCorrect: true, color: 'red', shape: 'triangle' },
          { id: '2', text: '2 - Rara vez completos', isCorrect: true, color: 'blue', shape: 'diamond' },
          { id: '3', text: '3 - Casi siempre disponible', isCorrect: true, color: 'yellow', shape: 'circle' },
          { id: '4', text: '4 - Excelentes condiciones e insumos completos', isCorrect: true, color: 'green', shape: 'square' },
        ],
      },
      {
        questionText: '¿Qué sugerencia o propuesta constructiva te gustaría compartir para mejorar el ambiente y la operación de nuestro cine?',
        questionType: 'type_answer',
        timeLimit: 0,
        pointsMultiplier: 0,
        explanation: 'Comentario anónimo abierto. Escribe libremente tus ideas para mejorar nuestro cine.',
        options: [],
        acceptedAnswers: ['*'],
      },
    ],
  },
];

export function instantiateQuizFromTemplate(template: QuizTemplateDefinition): Quiz {
  const quizId = generateUUID();
  return {
    id: quizId,
    title: template.name,
    description: template.description,
    category: template.category,
    coverImage: template.coverImage,
    timePerQuestion: template.quizKind === 'survey' ? 0 : 20,
    createdAt: new Date().toISOString(),
    isPublished: true,
    isExamOpen: true,
    preventRetries: false,
    maxAttemptsPerUser: template.isAnonymousSurvey ? 0 : 1,
    shuffleQuestions: template.quizKind !== 'survey',
    quizKind: template.quizKind || 'exam',
    isAnonymousSurvey: template.isAnonymousSurvey ?? false,
    questions: template.questions.map((q, idx) => ({
      ...q,
      id: generateUUID(),
      quizId,
      orderIndex: idx,
      options: q.options.map((opt, oIdx) => ({
        ...opt,
        id: generateUUID(),
        orderIndex: opt.orderIndex ?? oIdx,
      })),
    })),
  };
}
