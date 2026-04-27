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

// Function to check if a point is inside a quadrilateral (Geofencing)
function isPointInPolygon($lat, $lon, $polygon) {
    $inside = false;
    $n = count($polygon);
    for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
        $xi = $polygon[$i]['lat']; $yi = $polygon[$i]['lon'];
        $xj = $polygon[$j]['lat']; $yj = $polygon[$j]['lon'];
        $intersect = (($yi > $lon) != ($yj > $lon))
            && ($lat < ($xj - $xi) * ($lon - $yi) / ($yj - $yi) + $xi);
        if ($intersect) $inside = !$inside;
    }
    return $inside;
}

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

                // --- Geofencing Logic ---
                // Fetch classroom geofence points
                $q_geo = "SELECT r.lat_a, r.lon_a, r.lat_b, r.lon_b, r.lat_c, r.lon_c, r.lat_d, r.lon_d
                          FROM timetable t
                          JOIN classrooms r ON t.classroom_id = r.id
                          WHERE t.id = :tid LIMIT 1";
                $s_geo = $pdo->prepare($q_geo);
                $s_geo->execute([':tid' => $data->timetable_id]);
                $geo = $s_geo->fetch(PDO::FETCH_ASSOC);

                $status = 'Absent'; // Default if outside
                if ($geo && !empty($geo['lat_a'])) {
                    $polygon = [
                        ['lat' => (float)$geo['lat_a'], 'lon' => (float)$geo['lon_a']],
                        ['lat' => (float)$geo['lat_b'], 'lon' => (float)$geo['lon_b']],
                        ['lat' => (float)$geo['lat_c'], 'lon' => (float)$geo['lon_c']],
                        ['lat' => (float)$geo['lat_d'], 'lon' => (float)$geo['lon_d']]
                    ];
                    
                    if (isPointInPolygon((float)$data->latitude, (float)$data->longitude, $polygon)) {
                        $status = 'Present';
                    }
                }

                $query = "INSERT INTO attendance (user_id, course_id, timetable_id, lat_at_mark, lon_at_mark, status) 
                          VALUES (:uid, :cid, :tid, :lat, :lon, :status)";
                
                $stmt = $pdo->prepare($query);
                $success = $stmt->execute([
                    ':uid' => $data->user_id,
                    ':cid' => $data->course_id,
                    ':tid' => $data->timetable_id,
                    ':lat' => $data->latitude,
                    ':lon' => $data->longitude,
                    ':status' => $status
                ]);

                if ($success) {
                    echo json_encode([
                        "status" => "success", 
                        "message" => "Attendance marked as $status",
                        "attendance_status" => $status
                    ]);
                } else {
                    echo json_encode(["status" => "error", "message" => "Failed to mark"]);
                }
            }
            break;
        
        // --- 4. ADMIN DASHBOARD ---
        case 'get_admin_dashboard':
            $current_day = date('l');
            $query = "SELECT t.*, c.course_name, r.room_name 
                      FROM timetable t
                      JOIN courses c ON t.course_id = c.id
                      JOIN classrooms r ON t.classroom_id = r.id
                      WHERE t.day_of_week = :day 
                      ORDER BY t.start_time ASC";
            
            $stmt = $pdo->prepare($query);
            $stmt->execute([':day' => $current_day]);
            $lectures = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["status" => "success", "lectures" => $lectures]);
            break;

        // --- 5. UPDATE GEOFENCE ---
        case 'update_geofence':
            if (!empty($data->room_name)) {
                $room_name = $data->room_name;
                
                // Check if room exists
                $stmt = $pdo->prepare("SELECT id FROM classrooms WHERE room_name = :name LIMIT 1");
                $stmt->execute([':name' => $room_name]);
                $room = $stmt->fetch();

                if ($room) {
                    // Update
                    $query = "UPDATE classrooms SET 
                              lat_a = :lat_a, lon_a = :lon_a,
                              lat_b = :lat_b, lon_b = :lon_b,
                              lat_c = :lat_c, lon_c = :lon_c,
                              lat_d = :lat_d, lon_d = :lon_d
                              WHERE id = :id";
                    $stmt = $pdo->prepare($query);
                    $success = $stmt->execute([
                        ':lat_a' => $data->lat_a, ':lon_a' => $data->lon_a,
                        ':lat_b' => $data->lat_b, ':lon_b' => $data->lon_b,
                        ':lat_c' => $data->lat_c, ':lon_c' => $data->lon_c,
                        ':lat_d' => $data->lat_d, ':lon_d' => $data->lon_d,
                        ':id' => $room['id']
                    ]);
                } else {
                    // Insert
                    $query = "INSERT INTO classrooms (room_name, lat_a, lon_a, lat_b, lon_b, lat_c, lon_c, lat_d, lon_d) 
                              VALUES (:name, :lat_a, :lon_a, :lat_b, :lon_b, :lat_c, :lon_c, :lat_d, :lon_d)";
                    $stmt = $pdo->prepare($query);
                    $success = $stmt->execute([
                        ':name' => $room_name,
                        ':lat_a' => $data->lat_a, ':lon_a' => $data->lon_a,
                        ':lat_b' => $data->lat_b, ':lon_b' => $data->lon_b,
                        ':lat_c' => $data->lat_c, ':lon_c' => $data->lon_c,
                        ':lat_d' => $data->lat_d, ':lon_d' => $data->lon_d
                    ]);
                }

                if ($success) {
                    echo json_encode(["status" => "success", "message" => "Geofence updated"]);
                } else {
                    echo json_encode(["status" => "error", "message" => "Failed to save"]);
                }
            } else {
                echo json_encode(["status" => "error", "message" => "Room name is required"]);
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