<?php
// Render Environment Variables වලින් දත්ත ලබා ගැනීම
$host     = getenv('DB_HOST');
$port     = getenv('DB_PORT') ?: "5432";
$dbname   = getenv('DB_NAME');
$user     = getenv('DB_USER');
$password = getenv('DB_PASS');


try {
    // PostgreSQL සඳහා PDO DSN එක
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $conn = new PDO($dsn, $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // Connection එක success නම් මෙතනින් ඉදිරියට වැඩ කළ හැක
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>