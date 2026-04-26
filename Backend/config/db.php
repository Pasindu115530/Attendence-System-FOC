<?php
$host = getenv('DB_HOST');
$port = getenv('DB_PORT');
$dbname = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');

// DSN එකට අනිවාර්යයෙන් sslmode=require එකතු කරන්න
$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 10 // තත්පර 10ක් ඇතුළත connect නොවුවහොත් error එකක් පෙන්වයි
    ]);

    echo "Status: Connected to Supabase via IPv4 Proxy!";
} catch (PDOException $e) {
    // තවමත් error එකක් ආවොත් ඒක හරියටම මෙතනින් බලාගන්න පුළුවන්
    echo "Connection Failed: " . $e->getMessage();
}
?>