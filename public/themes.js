'use strict';

const THEMES = [
  {
    id: 'people',
    name: 'People & lifestyle',
    nameDe: 'Menschen und Lebensstil',
    blurb: 'Family, friends, healthy living, school and work.',
    accentHue: 220,
    topics: ['Identity & relationships', 'Healthy living & lifestyle', 'Education & work'],
    questions: [
      { de: 'Beschreibe deine Familie.', en: 'Describe your family.', topic: 'Identity & relationships' },
      { de: 'Wie ist deine Schule?', en: 'What is your school like?', topic: 'Education & work' },
      { de: 'Was machst du, um gesund zu bleiben?', en: 'What do you do to stay healthy?', topic: 'Healthy living & lifestyle' },
      { de: 'Was möchtest du nach der Schule machen?', en: 'What do you want to do after school?', topic: 'Education & work' },
      { de: 'Erzähl mir von deinem besten Freund.', en: 'Tell me about your best friend.', topic: 'Identity & relationships' },
    ],
  },
  {
    id: 'culture',
    name: 'Popular culture',
    nameDe: 'Populärkultur',
    blurb: 'Free time, festivals, music, and celebrities.',
    accentHue: 290,
    topics: ['Free-time activities', 'Customs, festivals & celebrations', 'Celebrity culture'],
    questions: [
      { de: 'Was machst du gern in deiner Freizeit?', en: 'What do you like to do in your free time?', topic: 'Free-time activities' },
      { de: 'Wie feierst du deinen Geburtstag?', en: 'How do you celebrate your birthday?', topic: 'Customs, festivals & celebrations' },
      { de: 'Wer ist dein Lieblingsstar und warum?', en: 'Who is your favourite celebrity and why?', topic: 'Celebrity culture' },
      { de: 'Welche Musik hörst du am liebsten?', en: 'What music do you most like to listen to?', topic: 'Free-time activities' },
      { de: 'Welches Fest in Deutschland möchtest du erleben?', en: 'Which festival in Germany would you like to experience?', topic: 'Customs, festivals & celebrations' },
    ],
  },
  {
    id: 'world',
    name: 'Communication & the world',
    nameDe: 'Kommunikation und die Welt',
    blurb: 'Travel, technology, the environment, and where you live.',
    accentHue: 160,
    topics: ['Travel & tourism', 'Media & technology', 'Environment & where people live'],
    questions: [
      { de: 'Was hast du letztes Wochenende gemacht?', en: 'What did you do last weekend?', topic: 'Travel & tourism' },
      { de: 'Wohin möchtest du in den Ferien fahren?', en: 'Where would you like to go on holiday?', topic: 'Travel & tourism' },
      { de: 'Wie oft benutzt du dein Handy?', en: 'How often do you use your phone?', topic: 'Media & technology' },
      { de: 'Was kann man machen, um die Umwelt zu schützen?', en: 'What can you do to protect the environment?', topic: 'Environment & where people live' },
      { de: 'Beschreibe deine Stadt oder dein Dorf.', en: 'Describe your town or village.', topic: 'Environment & where people live' },
    ],
  },
  {
    id: 'mix',
    name: 'Quickfire mix',
    nameDe: 'Bunt gemischt',
    blurb: 'A random run across every theme — exam-day practice.',
    accentHue: 30,
    isMix: true,
    topics: ['All themes', 'Random order', 'Exam simulation'],
    questions: [],
  },
];

THEMES.find(t => t.id === 'mix').questions = THEMES
  .filter(t => !t.isMix)
  .flatMap(t => t.questions);

window.THEMES = THEMES;
