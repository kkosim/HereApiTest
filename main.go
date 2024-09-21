package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"some_proj/models"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
	_ "github.com/lib/pq"
)


var db *gorm.DB
var jwtKey = []byte("your_secret_key") // Замените на свой секретный ключ

func main() {
	// Настройка базы данных

	// r := gin.Default()
    // r.LoadHTMLGlob("templates/*")

	//r.GET("/loginn", showLoginPage)
	var err error
	db, err = gorm.Open("postgres", "host=localhost user=postgres dbname=postgres sslmode=disable password=postgres")
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Миграция моделей
	db.AutoMigrate(&models.User{}, &models.RouteRequest{}, &models.ResponseToFront{})

	r := gin.Default()

	// Добавляем обработку CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Разрешённые источники
		AllowMethods:     []string{"POST", "GET"},                            // Разрешённые методы
		AllowHeaders:     []string{"Content-Type", "Authorization"},          // Разрешённые заголовки
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.POST("/login", login)
	r.POST("/calculateRoute", calculateRoute)
	r.GET("/report", getReport)

	if err := r.Run(":8182"); err != nil {
		log.Fatal("Failed to run server:", err)
	}
}

// Хэндлер для логина и получения JWT-токена
func login(c *gin.Context) {
	//c.HTML(http.StatusOK, "demo.html", nil)
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Здесь можно добавить проверку пользователя и пароля из базы данных
	// В данном примере просто генерируется токен для любого пользователя
	expirationTime := time.Now().Add(5 * time.Minute)
	claims := &models.Claims{
		Username: user.Username,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}

// Хэндлер для расчета маршрута
func calculateRoute(c *gin.Context) {
	var routeRequest models.RouteRequest
	if err := c.ShouldBindJSON(&routeRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Модификаторы расхода топлива в зависимости от типа транспорта
	fuelModifiers := map[string]float64{
		"car":        8.2,
		"truck":      13.2,
		"taxi":       7.8,
		"bus":        11.5,
		"privateBus": 10.7,
	}

	fuelModifier, exists := fuelModifiers[routeRequest.TransportMode]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transport mode"})
		return
	}

	// Запрос на HERE API
	hereAPIKey :="W9cPaucpboszLhvuBo97wqb2LxvoOuuH47Hiao2WeNQ"
	url := fmt.Sprintf("https://router.hereapi.com/v8/routes?origin=%s&destination=%s&apiKey=%s&return=polyline,summary,actions,instructions&transportMode=%s",
		routeRequest.Origin, routeRequest.Destination, hereAPIKey, routeRequest.TransportMode)

	resp, err := http.Get(url)
	if err != nil  {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get route from HERE API"})
		return
	}
	defer resp.Body.Close()
	

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println("Error reading response body:", err)
		//return nil, fmt.Errorf("failed to read response body")
	}


	//log.Println(string(body))
	// Создаем переменную для хранения ответа
	var routeResponse models.RouteResponse

	// Парсим JSON в структуру
	if err := json.Unmarshal(body, &routeResponse); err != nil {
		log.Println("Error parsing response:", err)
		//return nil, fmt.Errorf("failed to parse response from HERE API")
	}
	// Обработка ответа и расчет расхода топлива
	// В данном примере рассчитывается общее расстояние и расход топлива
	// Добавьте обработку JSON-ответа в соответствии с вашим форматом данных

	var respToFront models.ResponseToFront

	respToFront.Distance = routeResponse.Routes[0].Sections[0].Summary.Length // Примерное расстояние
	respToFront.FuelUsed = (respToFront.Distance / 100000.0) * fuelModifier
	respToFront.CreatedAt = time.Now()
	respToFront.Origin = fmt.Sprint(routeResponse.Routes[0].Sections[0].Departure.Place.Location.Lat) + ", " + fmt.Sprint(routeResponse.Routes[0].Sections[0].Departure.Place.Location.Lng)
	respToFront.Destination = fmt.Sprint(routeResponse.Routes[0].Sections[0].Arrival.Place.Location.Lat) + ", " + fmt.Sprint(routeResponse.Routes[0].Sections[0].Arrival.Place.Location.Lng)
	respToFront.TransportMode = routeResponse.Routes[0].Sections[0].Transport.Mode
	respToFront.DepartureTime = routeResponse.Routes[0].Sections[0].Departure.Time
	respToFront.ArrivalTime = routeResponse.Routes[0].Sections[0].Arrival.Time

	//Сохранение запроса в базу данных
	if err := db.Create(&respToFront).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save route request"})
		return
	}

	// log.Println(routeResponse)
	// log.Println(respToFront.Distance)
	// log.Println(respToFront.FuelUsed)
	c.JSON(http.StatusOK, gin.H{
		"origin": fmt.Sprint(routeResponse.Routes[0].Sections[0].Arrival.Place.Location.Lat) + ", " + fmt.Sprint(routeResponse.Routes[0].Sections[0].Arrival.Place.Location.Lng),
		"destination" : fmt.Sprint(routeResponse.Routes[0].Sections[0].Departure.Place.Location.Lat) + ", " + fmt.Sprint(routeResponse.Routes[0].Sections[0].Departure.Place.Location.Lng),
		"arrival_time": routeResponse.Routes[0].Sections[0].Arrival.Time,
		"departure_time": routeResponse.Routes[0].Sections[0].Departure.Time,
		"distance":  respToFront.Distance,
		"fuel_used": respToFront.FuelUsed,
	})
}

// Хэндлер для получения отчета из базы данных
func getReport(c *gin.Context) {
	var reports []models.ResponseToFront
	if err := db.Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch report"})
		return
	}

	// Формирование краткого отчета
	var report []gin.H
	for _, req := range reports {
		report = append(report, gin.H{
			"origin":        req.Origin,
			"destination":   req.Destination,
			"transportMode": req.TransportMode,
			"distance":      req.Distance,
			"fuel_used":     req.FuelUsed,
			"created_at":    req.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"report": report})
}
