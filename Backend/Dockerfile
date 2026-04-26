FROM php:8.2-apache

# PostgreSQL සඳහා අවශ්‍ය system libraries සහ PHP extensions install කිරීම
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql mysqli

# ඔබේ code එක copy කිරීම
COPY . /var/www/html/

# Port එක expose කිරීම
EXPOSE 80