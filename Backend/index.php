<?php
// ශ්‍රී ලංකාවේ වේලාව නිවැරදිව ලබා ගැනීමට
date_default_timezone_set('Asia/Colombo');
// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database Environment Variables
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

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(["status" => "error", "message" => "Invalid Request Method"]);
        exit;
    }

    $action = $data->action ?? '';

    switch ($action) {
        
        // --- 1. LOGIN FUNCTION ---
        case 'login':
            if (!empty($data->username) && !empty($data->password)) {
                $query = "SELECT user_id, nic, role FROM users WHERE user_id = :u AND nic = :p LIMIT 1";
                $stmt = $pdo->prepare($query);
                $stmt->execute([':u' => $data->username, ':p' => $data->password]);
                $user_row = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($user_row) {
                    echo json_encode(["status" => "success", "data" => $user_row]);
                } else {
                    echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
                }
            }
            break;

        // --- 2. GET CURRENT OR NEXT LECTURE ---
        case 'get_dashboard':
            $current_day = date('l');
            $current_time = date('H:i:s');
            $student_id = $data->user_id ?? '';

            // පළමුව දැනට පවතින (Ongoing) එක බලමු
            $query = "SELECT t.*, c.course_name, r.room_name 
                      FROM timetable t
                      JOIN courses c ON t.course_id = c.id
                      JOIN classrooms r ON t.classroom_id = r.id
                      WHERE t.day_of_week = :day AND :time BETWEEN t.start_time AND t.end_time LIMIT 1";
            
            $stmt = $pdo->prepare($query);
            $stmt->execute([':day' => $current_day, ':time' => $current_time]);
            $lecture = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($lecture) {
                $lecture['isLive'] = true;
                
                // Check if already marked
                if (!empty($student_id)) {
                    $current_date = date('Y-m-d');
                    $q_check = "SELECT id FROM attendance WHERE user_id = :uid AND timetable_id = :tid AND DATE(marked_at) = :today LIMIT 1";
                    $s_check = $pdo->prepare($q_check);
                    $s_check->execute([':uid' => $student_id, ':tid' => $lecture['id'], ':today' => $current_date]);
                    $lecture['hasMarked'] = (bool)$s_check->fetch();
                } else {
                    $lecture['hasMarked'] = false;
                }

                echo json_encode(["status" => "success", "lecture" => $lecture]);
            } else {
                // Ongoing නැතිනම් ඊළඟට එන (Upcoming) එක බලමු
                $query_next = "SELECT t.*, c.course_name, r.room_name 
                               FROM timetable t
                               JOIN courses c ON t.course_id = c.id
                               JOIN classrooms r ON t.classroom_id = r.id
                               WHERE t.day_of_week = :day AND t.start_time > :time 
                               ORDER BY t.start_time ASC LIMIT 1";
                $stmt_next = $pdo->prepare($query_next);
                $stmt_next->execute([':day' => $current_day, ':time' => $current_time]);
                $next_lecture = $stmt_next->fetch(PDO::FETCH_ASSOC);

                if ($next_lecture) {
                    $next_lecture['isLive'] = false;
                    echo json_encode(["status" => "success", "lecture" => $next_lecture]);
                } else {
                    echo json_encode(["status" => "success", "lecture" => null, "message" => "No more lectures today"]);
                }
            }
            break;

        // --- 3. MARK ATTENDANCE ---
        case 'mark_attendance':
            if (!empty($data->user_id) && !empty($data->timetable_id)) {
                $current_date = date('Y-m-d');
                // Check if already marked to prevent duplicates
                $q_check = "SELECT id FROM attendance WHERE user_id = :uid AND timetable_id = :tid AND DATE(marked_at) = :today LIMIT 1";
                $s_check = $pdo->prepare($q_check);
                $s_check->execute([':uid' => $data->user_id, ':tid' => $data->timetable_id, ':today' => $current_date]);
                
                if ($s_check->fetch()) {
                    echo json_encode(["status" => "error", "message" => "Already marked for today"]);
                    break;
                }

                $query = "INSERT INTO attendance (user_id, course_id, timetable_id, lat_at_mark, lon_at_mark, status) 
                          VALUES (:uid, :cid, :tid, :lat, :lon, 'Present')";
                
                $stmt = $pdo->prepare($query);
                $success = $stmt->execute([
                    ':uid' => $data->user_id,
                    ':cid' => $data->course_id,
                    ':tid' => $data->timetable_id,
                    ':lat' => $data->latitude,
                    ':lon' => $data->longitude
                ]);

                if ($success) {
                    echo json_encode(["status" => "success", "message" => "Attendance marked"]);
                } else {
                    echo json_encode(["status" => "error", "message" => "Failed to mark"]);
                }
            }
            break;

        default:
            echo json_encode(["status" => "error", "message" => "Unknown action"]);
            break;
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "DB Error: " . $e->getMessage()]);
}
?>