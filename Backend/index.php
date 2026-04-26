<?php
// Request eka ena URL eka gannawa
$request = $_SERVER['REQUEST_URI'];

// "/Backend/api/" kalla path ekata ekathu karanawa
$path = __DIR__ . '/Backend/api' . $request;

// Hariyata file ekak thiyenawa nam eka load karanawa
if (file_exists($path) && is_file($path)) {
    include $path;
} else {
    // File eka nathi nam login.php ekata redirect karanawa
    include __DIR__ . '/Backend/api/login.php';
}
?>