<?php
// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Render Environment Variables
$host = getenv('DB_HOST'); 
$port = getenv('DB_PORT') ?: '6543'; 
$dbname = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');

$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";

try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $json = file_get_contents('php://input');
    $data = json_decode($json);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!empty($data->username) && !empty($data->password)) {
            
            // App එකෙන් එවන දත්ත (Username = user_id, Password = nic)
            $input_user_id = $data->username;
            $input_nic = $data->password; 

            // Query එක වෙනස් කළා: user_id සහ nic පරීක්ෂා කර එම දත්තම ලබා ගැනීමට
            $query = "SELECT user_id, nic, role FROM users WHERE user_id = :user_id AND nic = :nic LIMIT 1";
            
            $stmt = $pdo->prepare($query);
            $stmt->bindParam(':user_id', $input_user_id);
            $stmt->bindParam(':nic', $input_nic);
            $stmt->execute();

            $user_row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user_row) {
                // සාර්ථක නම් user_id, nic සහ role එක යවනවා
                echo json_encode([
                    "status" => "success",
                    "user_id" => $user_row['user_id'],
                    "nic" => $user_row['nic'],
                    "role" => $user_row['role'],
                    "message" => "Login successful"
                ]);
            } else {
                echo json_encode([
                    "status" => "error",
                    "message" => "Invalid User ID or NIC"
                ]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Please enter both User ID and NIC"]);
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