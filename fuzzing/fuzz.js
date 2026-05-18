const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Генерация случайной строки с аномалиями
const generateRandomInput = () => {
  const payloads = [
    '',                                   // пустая строка
    'a'.repeat(10000),                    // очень длинная строка (10k символов)
    null,                                 // null значение
    undefined,                            // undefined
    'DROP TABLE users; --',               // SQL инъекция
    '<script>alert("xss")</script>',      // XSS
    '{"__proto__": {"admin": true}}',     // прототипное загрязнение
    '\\u0000\\u0001\\u0002',              // нулевые байты
    '!\'"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~', // спецсимволы
    '😀😁😂😃😄😅😆😇😈😉😊😋😌😍😎😏',        // эмодзи
    'русский текст с пробелами и 数字',     // смесь языков
    '   ',                                // только пробелы
    '\n\r\t\b\f',                         // управляющие символы
    'a'.repeat(100) + '\\x00' + 'b'.repeat(100), // бинарные данные
  ];
  
  // Рандомно выбираем один из payloads
  const index = Math.floor(Math.random() * payloads.length);
  return payloads[index];
};

// Генерация случайного email
const generateRandomEmail = () => {
  const domains = ['test.com', 'example.ru', 'mail.ru', 'gmail.com'];
  const randomString = Math.random().toString(36).substring(2, 8);
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  return `${randomString}@${randomDomain}`;
};

// Генерация случайной роли
const generateRandomRole = () => {
  const roles = ['client', 'psychologist', 'admin', 'hacker', '', null, undefined, '123', 'user'];
  const index = Math.floor(Math.random() * roles.length);
  return roles[index];
};

// Тестирование регистрации
const testRegister = async (testCase) => {
  const testData = {
    name: testCase.name,
    email: testCase.email,
    password: testCase.password,
    role: testCase.role
  };
  
  try {
    const startTime = Date.now();
    const response = await axios.post(`${API_URL}/auth/register`, testData);
    const duration = Date.now() - startTime;
    
    console.log(`✅ [${testCase.id}] УСПЕХ | ${duration}ms | Статус: ${response.status}`);
    console.log(`   Данные: ${JSON.stringify(testData).substring(0, 100)}`);
    return { success: true, status: response.status, duration };
  } catch (error) {
    const duration = Date.now() - (error.config?.startTime || 0);
    const status = error.response?.status || 'NETWORK_ERROR';
    const message = error.response?.data?.message || error.message;
    
    console.log(`❌ [${testCase.id}] ОШИБКА | ${duration}ms | Статус: ${status} | ${message.substring(0, 80)}`);
    console.log(`   Данные: ${JSON.stringify(testData).substring(0, 100)}`);
    return { success: false, status, duration, error: message };
  }
};

// Главная функция фаззинга
const runFuzzing = async () => {
  console.log('🧪 ========== НАЧАЛО ФАЗЗИНГ-ТЕСТИРОВАНИЯ ==========\n');
  console.log(`⏰ Время: ${new Date().toLocaleString()}\n`);
  
  const testCases = [];
  
  // Создаём 50 тестовых кейсов с разными аномалиями
  for (let i = 0; i < 50; i++) {
    const anomalyName = generateRandomInput();
    const anomalyPassword = generateRandomInput();
    const anomalyEmail = Math.random() > 0.5 ? generateRandomEmail() : generateRandomInput();
    const anomalyRole = generateRandomRole();
    
    // Разные комбинации полей
    if (i % 3 === 0) {
      // Нормальное имя, аномальный пароль
      testCases.push({
        id: i + 1,
        name: `User${i}`,
        email: anomalyEmail,
        password: anomalyPassword,
        role: 'client'
      });
    } else if (i % 3 === 1) {
      // Аномальное имя, нормальный пароль
      testCases.push({
        id: i + 1,
        name: anomalyName,
        email: anomalyEmail,
        password: 'pass123',
        role: 'client'
      });
    } else {
      // Аномальная роль
      testCases.push({
        id: i + 1,
        name: `TestUser${i}`,
        email: anomalyEmail,
        password: 'password123',
        role: anomalyRole
      });
    }
  }
  
  // Добавляем специальные критические тесты
  const criticalTests = [
    { id: 51, name: '', email: 'test@test.com', password: '123', role: 'client' },
    { id: 52, name: 'a'.repeat(10000), email: 'test@test.com', password: '123', role: 'client' },
    { id: 53, name: 'User', email: '', password: '123', role: 'client' },
    { id: 54, name: 'User', email: 'test@test.com', password: '', role: 'client' },
    { id: 55, name: 'User', email: 'test@test.com', password: '123', role: '' },
    { id: 56, name: null, email: 'test@test.com', password: '123', role: 'client' },
    { id: 57, name: 'User', email: null, password: '123', role: 'client' },
    { id: 58, name: 'User', email: 'test@test.com', password: null, role: 'client' },
    { id: 59, name: 'User', email: 'sql-injection\'; DROP TABLE users; --', password: '123', role: 'client' },
    { id: 60, name: '<img src=x onerror=alert(1)>', email: 'xss@test.com', password: '123', role: 'client' },
  ];
  
  testCases.push(...criticalTests);
  
  let successCount = 0;
  let errorCount = 0;
  const results = [];
  
  // Запускаем тесты последовательно (чтобы не перегружать сервер)
  for (const testCase of testCases) {
    const result = await testRegister(testCase);
    results.push(result);
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Статистика
  console.log('\n📊 ========== РЕЗУЛЬТАТЫ ФАЗЗИНГ-ТЕСТИРОВАНИЯ ==========');
  console.log(`✅ Успешных запросов: ${successCount}`);
  console.log(`❌ Ошибок: ${errorCount}`);
  console.log(`📊 Всего тестов: ${testCases.length}`);
  
  const successRate = (successCount / testCases.length * 100).toFixed(2);
  console.log(`📈 Процент успеха: ${successRate}%`);
  
  // Анализ статусов ответов
  const statusCounts = {};
  results.forEach(r => {
    const status = r.status || 'ERROR';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  console.log('\n📋 Распределение статусов:');
  Object.keys(statusCounts).sort().forEach(status => {
    console.log(`   ${status}: ${statusCounts[status]}`);
  });
  
  // Вывод критических багов (когда сервер упал или вернул 500)
  const criticalBugs = results.filter(r => r.status === 500 || r.status === 'NETWORK_ERROR');
  if (criticalBugs.length > 0) {
    console.log('\n⚠️ КРИТИЧЕСКИЕ БАГИ (сервер упал или вернул 500):');
    criticalBugs.forEach(bug => {
      console.log(`   - Статус: ${bug.status}, Ошибка: ${bug.error?.substring(0, 100)}`);
    });
  } else {
    console.log('\n✅ Критических багов не обнаружено! Сервер стабилен.');
  }
  
  console.log('\n🏁 ========== ФАЗЗИНГ-ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ==========');
};

// Запуск
runFuzzing().catch(console.error);