<?php
// 1. Error reporting (Development වලදී විතරක් තියාගන්න, Live දාද්දී off කරන්න)
ini_set('display_errors', 0); // Live server එකකදී error පෙන්වීම ආරක්ෂිත නැහැ
error_reporting(E_ALL);

// 2. Headers
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS"); // OPTIONS header එකත් එකතු කරන්න
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// React Native එකෙන් එවන "Preflight" request එක handle කිරීමට
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require '../config/db.php';

// 3. Request Method Check
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Invalid Request Method"]);
    exit;
}

// 4. Input handling
$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input, true);

// InfinityFree එකේදී සමහරවිට JSON එක decode නොවී තිබුණොත් $_POST බලන්නත් පුළුවන්
if (!$data) {
    $input_user = $_POST['username'] ?? '';
    $input_pass = $_POST['password'] ?? '';
} else {
    $input_user = $data['username'] ?? ''; 
    $input_pass = $data['password'] ?? ''; 
}

if (empty($input_user) || empty($input_pass)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "Credentials required"]);
    exit;
}

try {
    // 5. Database Query
    // nic එකත් select කරගන්න password check එකට
    $stmt = $conn->prepare("SELECT user_id, full_name, nic, role FROM users WHERE user_id = ?");
    $stmt->execute([$input_user]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // 6. Password Check (මෙහිදී password ලෙස පාවිච්චි කරන්නේ NIC එක)
        if ($input_pass === $user['nic']) {
            
            $role = strtolower($user['role']);
            
            $response = [
                "status" => "success",
                "role" => $role,
                "user_id" => $user['user_id'],
                "full_name" => $user['full_name'],
                "redirect" => ($role === 'admin') ? "AdminDashboard" : "UserDashboard"
            ];

            http_response_code(200);
            echo json_encode($response);
            exit;
        }
    }

    // වැරදි username හෝ password නම්
    http_response_code(401); // Unauthorized
    echo json_encode(["status" => "error", "message" => "Invalid User ID or Password"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Internal Server Error"]);
    // Error එක ලොග් එකට දාන්න, User ට පෙන්වන්න එපා (Security)
    error_log($e->getMessage());
}
?>