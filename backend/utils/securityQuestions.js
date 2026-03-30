const QUESTIONS = [
  "What is your mother's maiden name?",
  "What is your grandmother's first name?",
  'In what city were you born?',
  "What is your oldest sibling's middle name?",
  'What was the name of your primary school?',
  'What was your first job position?',
  "What was your favorite teacher's last name?",
  'What is your college mascot?',
  'What was the name of your first pet?',
  'What is your favorite wild animal?',
  'What pet do you most wish you owned?',
  'What was the name of your childhood dog?',
  'What is your favorite book?',
  'What sport do you play most?',
  'What is your favorite cuisine type?',
  'What musical instrument can you play?',
  'What is your favorite childhood memory?',
  'What was the make of your first car?',
  'What is the nickname your family calls you?',
  'What was your favorite vacation spot?',
  'What color is your car?',
  'What is your favorite sports team?',
  'What is your lucky number?',
  'What is your favorite holiday?',
  'In what city did you meet your best friend?',
  'What is your favorite place to visit?',
  'Where did you get married or have your first date?',
  'What city do you most want to visit?',
  'What is your favorite quote or motto?',
  'If you could have any superpower, what would it be?',
  'What is something unique about your family?',
  'What was the name of your high school band?',
];

function normalizeAnswer(answer) {
  return String(answer || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isValidSecurityAnswer(answer) {
  if (!answer || typeof answer !== 'string') return false;
  const trimmed = answer.trim();
  if (trimmed.length < 2 || trimmed.length > 200) return false;
  if (/^(123456|password|admin|test)$/i.test(trimmed)) return false;
  return true;
}

export { QUESTIONS, normalizeAnswer, isValidSecurityAnswer };
