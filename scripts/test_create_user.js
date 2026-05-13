// Native fetch is available in Node 18+

async function testCreateUser() {
    const url = 'http://localhost:3001/api/users/create';
    const body = {
        studentId: 'testuser_' + Date.now(),
        name: 'Test User',
        password: 'password123'
    };

    console.log("Testing Create User API...");

    try {
        // Test 1: Create User (Success)
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-role': 'admin'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Response:", data);

        if (res.status === 200) {
            console.log("✅ Test 1 Passed: User created successfully");
        } else {
            console.log("❌ Test 1 Failed");
        }

        // Test 2: Create Duplicate User (Fail)
        const res2 = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-role': 'admin'
            },
            body: JSON.stringify(body)
        });
        const data2 = await res2.json();
        if (res2.status === 400 && data2.error === "User already exists") {
            console.log("✅ Test 2 Passed: Duplicate check works");
        } else {
            console.log("❌ Test 2 Failed: Expected 400 for duplicate");
        }

        // Test 3: Unauthorized (Fail)
        const res3 = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No admin header
            },
            body: JSON.stringify({ ...body, studentId: body.studentId + '_new' })
        });
        const data3 = await res3.json();
        if (res3.status === 403) {
            console.log("✅ Test 3 Passed: Unauthorized access blocked");
        } else {
            console.log("❌ Test 3 Failed: Expected 403");
        }

    } catch (err) {
        console.error("Test Error:", err);
    }
}

testCreateUser();
