import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('Добавьте в backend/.env и Render (flower-api):');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:ваш@email.com');
console.log('');
console.log('И в frontend / Render (flower-web) при сборке:');
console.log(`REACT_APP_VAPID_PUBLIC_KEY=${keys.publicKey}`);
