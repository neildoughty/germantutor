'use strict';

const THEMES_DE = [
  {
    id: 'people',
    name: 'People & lifestyle',
    nameNative: 'Menschen und Lebensstil',
    blurb: 'Family, friends, healthy living, school and work.',
    accentHue: 220,
    topics: ['Identity & relationships', 'Healthy living & lifestyle', 'Education & work'],
    questions: [
      { text: 'Beschreibe deine Familie.', en: 'Describe your family.', topic: 'Identity & relationships' },
      { text: 'Wie ist deine Schule?', en: 'What is your school like?', topic: 'Education & work' },
      { text: 'Was machst du, um gesund zu bleiben?', en: 'What do you do to stay healthy?', topic: 'Healthy living & lifestyle' },
      { text: 'Was möchtest du nach der Schule machen?', en: 'What do you want to do after school?', topic: 'Education & work' },
      { text: 'Erzähl mir von deinem besten Freund.', en: 'Tell me about your best friend.', topic: 'Identity & relationships' },
    ],
  },
  {
    id: 'culture',
    name: 'Popular culture',
    nameNative: 'Populärkultur',
    blurb: 'Free time, festivals, music, and celebrities.',
    accentHue: 290,
    topics: ['Free-time activities', 'Customs, festivals & celebrations', 'Celebrity culture'],
    questions: [
      { text: 'Was machst du gern in deiner Freizeit?', en: 'What do you like to do in your free time?', topic: 'Free-time activities' },
      { text: 'Wie feierst du deinen Geburtstag?', en: 'How do you celebrate your birthday?', topic: 'Customs, festivals & celebrations' },
      { text: 'Wer ist dein Lieblingsstar und warum?', en: 'Who is your favourite celebrity and why?', topic: 'Celebrity culture' },
      { text: 'Welche Musik hörst du am liebsten?', en: 'What music do you most like to listen to?', topic: 'Free-time activities' },
      { text: 'Welches Fest in Deutschland möchtest du erleben?', en: 'Which festival in Germany would you like to experience?', topic: 'Customs, festivals & celebrations' },
    ],
  },
  {
    id: 'world',
    name: 'Communication & the world',
    nameNative: 'Kommunikation und die Welt',
    blurb: 'Travel, technology, the environment, and where you live.',
    accentHue: 160,
    topics: ['Travel & tourism', 'Media & technology', 'Environment & where people live'],
    questions: [
      { text: 'Was hast du letztes Wochenende gemacht?', en: 'What did you do last weekend?', topic: 'Travel & tourism' },
      { text: 'Wohin möchtest du in den Ferien fahren?', en: 'Where would you like to go on holiday?', topic: 'Travel & tourism' },
      { text: 'Wie oft benutzt du dein Handy?', en: 'How often do you use your phone?', topic: 'Media & technology' },
      { text: 'Was kann man machen, um die Umwelt zu schützen?', en: 'What can you do to protect the environment?', topic: 'Environment & where people live' },
      { text: 'Beschreibe deine Stadt oder dein Dorf.', en: 'Describe your town or village.', topic: 'Environment & where people live' },
    ],
  },
  {
    id: 'mix',
    name: 'Quickfire mix',
    nameNative: 'Bunt gemischt',
    blurb: 'A random run across every theme — exam-day practice.',
    accentHue: 30,
    isMix: true,
    topics: ['All themes', 'Random order', 'Exam simulation'],
    questions: [],
  },
];

const THEMES_FR = [
  {
    id: 'people',
    name: 'People & lifestyle',
    nameNative: 'Les gens et le mode de vie',
    blurb: 'Family, friends, healthy living, school and work.',
    accentHue: 220,
    topics: ['Identity & relationships', 'Healthy living & lifestyle', 'Education & work'],
    questions: [
      { text: 'Décris ta famille.', en: 'Describe your family.', topic: 'Identity & relationships' },
      { text: 'Comment est ton école?', en: 'What is your school like?', topic: 'Education & work' },
      { text: "Qu'est-ce que tu fais pour rester en bonne santé?", en: 'What do you do to stay healthy?', topic: 'Healthy living & lifestyle' },
      { text: "Qu'est-ce que tu voudrais faire après l'école?", en: 'What would you like to do after school?', topic: 'Education & work' },
      { text: 'Parle-moi de ton meilleur ami ou ta meilleure amie.', en: 'Tell me about your best friend.', topic: 'Identity & relationships' },
    ],
  },
  {
    id: 'culture',
    name: 'Popular culture',
    nameNative: 'La culture populaire',
    blurb: 'Free time, festivals, music, and celebrities.',
    accentHue: 290,
    topics: ['Free-time activities', 'Customs, festivals & celebrations', 'Celebrity culture'],
    questions: [
      { text: "Qu'est-ce que tu aimes faire pendant ton temps libre?", en: 'What do you like to do in your free time?', topic: 'Free-time activities' },
      { text: "Comment est-ce que tu fêtes ton anniversaire?", en: 'How do you celebrate your birthday?', topic: 'Customs, festivals & celebrations' },
      { text: 'Qui est ta célébrité préférée et pourquoi?', en: 'Who is your favourite celebrity and why?', topic: 'Celebrity culture' },
      { text: "Quelle musique est-ce que tu aimes écouter?", en: 'What music do you like to listen to?', topic: 'Free-time activities' },
      { text: 'Quel festival en France est-ce que tu voudrais visiter?', en: 'Which festival in France would you like to visit?', topic: 'Customs, festivals & celebrations' },
    ],
  },
  {
    id: 'world',
    name: 'Communication & the world',
    nameNative: 'La communication et le monde',
    blurb: 'Travel, technology, the environment, and where you live.',
    accentHue: 160,
    topics: ['Travel & tourism', 'Media & technology', 'Environment & where people live'],
    questions: [
      { text: "Qu'est-ce que tu as fait le week-end dernier?", en: 'What did you do last weekend?', topic: 'Travel & tourism' },
      { text: 'Où est-ce que tu voudrais aller en vacances?', en: 'Where would you like to go on holiday?', topic: 'Travel & tourism' },
      { text: 'À quelle fréquence est-ce que tu utilises ton portable?', en: 'How often do you use your phone?', topic: 'Media & technology' },
      { text: "Qu'est-ce qu'on peut faire pour protéger l'environnement?", en: 'What can we do to protect the environment?', topic: 'Environment & where people live' },
      { text: 'Décris ta ville ou ton village.', en: 'Describe your town or village.', topic: 'Environment & where people live' },
    ],
  },
  {
    id: 'mix',
    name: 'Quickfire mix',
    nameNative: 'Mélange rapide',
    blurb: 'A random run across every theme — exam-day practice.',
    accentHue: 30,
    isMix: true,
    topics: ['All themes', 'Random order', 'Exam simulation'],
    questions: [],
  },
];

THEMES_DE.find(t => t.id === 'mix').questions = THEMES_DE
  .filter(t => !t.isMix)
  .flatMap(t => t.questions);

THEMES_FR.find(t => t.id === 'mix').questions = THEMES_FR
  .filter(t => !t.isMix)
  .flatMap(t => t.questions);

window.THEMES_DE = THEMES_DE;
window.THEMES_FR = THEMES_FR;
window.THEMES = THEMES_DE; // backward compat
