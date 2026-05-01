<?php
// ශ්‍රී ලංකාවේ වේලාව නිවැරදිව ලබා ගැනීමට
date_default_timezone_set('Asia/Colombo');

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database Environment Variables (Supabase/PostgreSQL)
$host = getenv('DB_HOST'); 
$port = getenv('DB_PORT') ?: '6543'; 
$dbname = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');

$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";

/**
 * 1. Geofencing Logic: Point-in-Polygon (Ray Casting Algorithm)
 */
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

/**
 * 2. Haversine Formula: Points dekak athara dura meter walin ganna
 */
function getDistance($lat1, $lon1, $lat2, $lon2) {
    $earth_radius = 6371000; // Meters
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2) * sin($dLon/2);
    $c = 2 * atan2(sqrt($a), sqrt(1-$a));
    return $earth_radius * $c;
}

try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $json = file_get_contents('php://input');
    $data = json_decode($json);

    // Handle multipart/form-data (for file uploads)
    if (!$data && !empty($_POST['action'])) {
        $data = (object)$_POST;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(["status" => "error", "message" => "Invalid Request Method"]);
        exit;
    }

    $action = $data->action ?? '';

    switch ($action) {
        
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

        case 'get_dashboard':
            $current_day = date('l');
            $current_time = date('H:i:s');
            $student_id = $data->user_id ?? '';

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

        case 'mark_attendance':
            if (!empty($data->user_id) && !empty($data->timetable_id)) {
                $current_date = date('Y-m-d');
                
                // 1. Duplicate check
                $q_check = "SELECT id FROM attendance WHERE user_id = :uid AND timetable_id = :tid AND DATE(marked_at) = :today LIMIT 1";
                $s_check = $pdo->prepare($q_check);
                $s_check->execute([':uid' => $data->user_id, ':tid' => $data->timetable_id, ':today' => $current_date]);
                
                if ($s_check->fetch()) {
                    echo json_encode(["status" => "error", "message" => "Already marked for today"]);
                    break;
                }

                // 2. Geofence data fetch
                $q_geo = "SELECT r.lat_a, r.lon_a, r.lat_b, r.lon_b, r.lat_c, r.lon_c, r.lat_d, r.lon_d
                          FROM timetable t
                          JOIN classrooms r ON t.classroom_id = r.id
                          WHERE t.id = :tid LIMIT 1";
                $s_geo = $pdo->prepare($q_geo);
                $s_geo->execute([':tid' => $data->timetable_id]);
                $geo = $s_geo->fetch(PDO::FETCH_ASSOC);

                $status = 'Absent';
                if ($geo && !empty($geo['lat_a'])) {
                    $polygon = [
                        ['lat' => (float)$geo['lat_a'], 'lon' => (float)$geo['lon_a']],
                        ['lat' => (float)$geo['lat_b'], 'lon' => (float)$geo['lon_b']],
                        ['lat' => (float)$geo['lat_c'], 'lon' => (float)$geo['lon_c']],
                        ['lat' => (float)$geo['lat_d'], 'lon' => (float)$geo['lon_d']]
                    ];
                    
                    // Logic A: Inside Polygon
                    $isInside = isPointInPolygon((float)$data->latitude, (float)$data->longitude, $polygon);
                    
                    // Logic B: Center point check with 15m buffer
                    $centerLat = ((float)$geo['lat_a'] + (float)$geo['lat_c']) / 2;
                    $centerLon = ((float)$geo['lon_a'] + (float)$geo['lon_c']) / 2;
                    $distance = getDistance((float)$data->latitude, (float)$data->longitude, $centerLat, $centerLon);

                    if ($isInside || $distance <= 10) {
                        $status = 'Present';
                    }
                }

                // 3. Database entry
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
                        "attendance_status" => $status,
                        "distance" => isset($distance) ? round($distance, 2) . "m" : "N/A"
                    ]);
                } else {
                    echo json_encode(["status" => "error", "message" => "Failed to mark"]);
                }
            }
            break;

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

        case 'get_departments':
            // Fetch distinct departments from timetable or users
            $stmt = $pdo->query("SELECT DISTINCT dept_id FROM timetable ORDER BY dept_id ASC");
            $depts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["status" => "success", "departments" => $depts]);
            break;

        case 'get_batches':
            // Fetch distinct batches from users
            $stmt = $pdo->query("SELECT DISTINCT batch_year FROM users WHERE role = 'Student' AND batch_year IS NOT NULL ORDER BY batch_year DESC");
            $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["status" => "success", "batches" => $batches]);
            break;

        case 'get_courses':
            $dept_id = $data->dept_id ?? '';
            if ($dept_id) {
                // Fetch courses associated with this department in the timetable
                $stmt = $pdo->prepare("SELECT DISTINCT c.id, c.course_name 
                                     FROM courses c 
                                     JOIN timetable t ON c.id = t.course_id 
                                     WHERE t.dept_id = :did 
                                     ORDER BY c.course_name ASC");
                $stmt->execute([':did' => $dept_id]);
            } else {
                $stmt = $pdo->query("SELECT id, course_name FROM courses ORDER BY course_name ASC");
            }
            $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["status" => "success", "courses" => $courses]);
            break;

        case 'get_filtered_report':
            $dept_id = $data->dept_id;
            $batch = $data->batch;
            $course_id = $data->course_id;

            // Fetch students in this dept and batch
            // Calculate total sessions for this course in this dept
            // Calculate attended sessions for each student
            $query = "SELECT u.user_id, u.full_name, 
                      (SELECT COUNT(*) FROM attendance att WHERE att.user_id = u.user_id AND att.course_id = :cid) as attended_count,
                      (SELECT COUNT(*) FROM timetable tt WHERE tt.course_id = :cid AND tt.dept_id = :did) as total_sessions
                      FROM users u
                      WHERE u.role = 'Student' AND u.dept_id = :did AND u.batch_year = :batch
                      ORDER BY u.user_id ASC";

            $stmt = $pdo->prepare($query);
            $stmt->execute([':cid' => $course_id, ':did' => $dept_id, ':batch' => $batch]);
            $report = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate percentage and current status (Present if attended at least once or based on latest?)
            // Usually report shows overall attendance
            foreach ($report as &$row) {
                $total = (int)$row['total_sessions'] ?: 1;
                $attended = (int)$row['attended_count'];
                $row['percentage'] = round(($attended / $total) * 100, 1) . '%';
                $row['status'] = ($attended > 0) ? 'Active' : 'No Data'; // Placeholder status logic
            }

            echo json_encode(["status" => "success", "report" => $report]);
            break;

        case 'get_absent_records':
            $student_id = $data->student_id ?? '';
            if (empty($student_id)) {
                echo json_encode(["status" => "error", "message" => "Student ID required"]);
                break;
            }
            
            // Fetch records marked as 'Absent'
            $query = "SELECT a.id, a.marked_at as date, c.course_name 
                      FROM attendance a
                      JOIN courses c ON a.course_id = c.id
                      WHERE a.user_id = :sid AND a.status = 'Absent' 
                      ORDER BY a.marked_at DESC";
            $stmt = $pdo->prepare($query);
            $stmt->execute([':sid' => $student_id]);
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["status" => "success", "records" => $records]);
            break;

        case 'upload_medical':
            $record_id = $data->record_id ?? '';
            if (empty($record_id) || empty($_FILES['medical_file'])) {
                echo json_encode(["status" => "error", "message" => "Record ID and file required"]);
                break;
            }

            $file = $_FILES['medical_file'];
            $upload_dir = 'uploads/medical/';
            if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

            $file_ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $file_name = 'medical_' . $record_id . '_' . time() . '.' . $file_ext;
            $target_path = $upload_dir . $file_name;

            if (move_uploaded_file($file['tmp_name'], $target_path)) {
                // Update attendance record with medical report path
                // Note: We assume the column 'medical_report' exists or we can just update status?
                // Usually, uploading medical changes status to 'Medical' or just attaches it.
                $query = "UPDATE attendance SET medical_report = :path WHERE id = :id";
                $stmt = $pdo->prepare($query);
                $success = $stmt->execute([':path' => $target_path, ':id' => $record_id]);
                
                if ($success) {
                    echo json_encode(["status" => "success", "message" => "Medical report uploaded"]);
                } else {
                    echo json_encode(["status" => "error", "message" => "Failed to update record"]);
                }
            } else {
                echo json_encode(["status" => "error", "message" => "Failed to move uploaded file"]);
            }
            break;

        case 'update_geofence':
            if (!empty($data->room_name)) {
                $room_name = $data->room_name;
                $stmt = $pdo->prepare("SELECT id FROM classrooms WHERE room_name = :name LIMIT 1");
                $stmt->execute([':name' => $room_name]);
                $room = $stmt->fetch();

                if ($room) {
                    $query = "UPDATE classrooms SET 
                              lat_a = :lat_a, lon_a = :lon_a, lat_b = :lat_b, lon_b = :lon_b,
                              lat_c = :lat_c, lon_c = :lon_c, lat_d = :lat_d, lon_d = :lon_d
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
                echo json_encode(["status" => $success ? "success" : "error", "message" => $success ? "Geofence updated" : "Failed to save"]);
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