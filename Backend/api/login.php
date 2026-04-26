<?php
// CORS Headers - React Native එකට සම්බන්ධ වීමට ඉඩ ලබා දීම
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Render Environment Variables වලින් දත්ත ලබා ගැනීම
$host = getenv('DB_HOST'); 
$port = getenv('DB_PORT') ?: '6543'; 
$dbname = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');

// DSN String (SSL Mode අනිවාර්යයි)
$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";

try {
    // Database Connection
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // JSON දත්ත කියවා ගැනීම
    $json = file_get_contents('php://input');
    $data = json_decode($json);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!empty($data->username) && !empty($data->password)) {
            
            $username = $data->username;
            $password = $data->password; 

            // User සෙවීම (Table එක 'users' ලෙස උපකල්පනය කර ඇත)
            $query = "SELECT username, role FROM users WHERE username = :username AND password = :password LIMIT 1";
            $stmt = $pdo->prepare($query);
            $stmt->bindParam(':username', $username);
            $stmt->bindParam(':password', $password);
            $stmt->execute();

            $user_row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user_row) {
                echo json_encode([
                    "status" => "success",
                    "role" => $user_row['role'],
                    "message" => "Login successful"
                ]);
            } else {
                echo json_encode([
                    "status" => "error",
                    "message" => "Invalid username or password"
                ]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Please provide both username and password"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid Request Method"]);
    }

} catch (PDOException $e) {
    echo json_encode([
        "status" => "error", 
        "message" => "Database Connection Failed: " . $e->getMessage()
    ]);
}
?>