// Test proxy configuration
const BASE_URL = 'http://localhost:3000'; // Frontend with proxy

async function testProxy() {
  console.log('Testing proxy configuration...\n');

  try {
    // Test 1: Test proxy to login endpoint
    console.log('1. Testing proxy to login endpoint...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log(`✗ HTTP error: ${loginResponse.status}`);
      console.log('Response:', await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (loginData.code === 200) {
      console.log('✓ Proxy to login endpoint works!\n');
      
      // Test 2: Test proxy to me endpoint with token
      console.log('2. Testing proxy to user info endpoint...');
      const token = loginData.data.token;
      const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!meResponse.ok) {
        console.log(`✗ HTTP error: ${meResponse.status}`);
        console.log('Response:', await meResponse.text());
        return;
      }
      
      const meData = await meResponse.json();
      console.log('User info response:', JSON.stringify(meData, null, 2));
      
      if (meData.code === 200) {
        console.log('✓ Proxy to user info endpoint works!\n');
        console.log('All proxy tests passed! ✓');
      } else {
        console.log('✗ User info test failed');
      }
    } else {
      console.log('✗ Login test failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Make sure the frontend server is running on port 15174');
  }
}

// Run the test
testProxy();