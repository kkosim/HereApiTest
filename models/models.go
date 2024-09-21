package models

import (
	"time"
	"github.com/dgrijalva/jwt-go"
)

// Модель для пользователя
type User struct {
	ID       uint   `gorm:"primaryKey"`
	Username string `gorm:"unique"`
	Password string
}

// Модель для запроса на маршрутизацию
type RouteRequest struct {
	ID            uint      `gorm:"primaryKey"`
	Origin        string    `json:"origin"`
	Destination   string    `json:"destination"`
	TransportMode string    `json:"transportMode"`
	CreatedAt     time.Time `json:"created_at"`
}

type ResponseToFront struct {
	ID            uint      `gorm:"primaryKey"`
	Origin        string    `json:"origin"`
	Destination   string    `json:"destination"`
	TransportMode string    `json:"transportMode"`
	DepartureTime time.Time `json:"departureTime"`
	ArrivalTime time.Time `json:"arrivalTime"`
	Distance      float64   `json:"distance"`
	FuelUsed      float64   `json:"fuel_used"`
	CreatedAt     time.Time `json:"created_at"`
}



// RouteResponse представляет весь JSON-ответ.
type RouteResponse struct {
	Routes []Route `json:"routes"`
}

// Route представляет один маршрут с идентификатором и секциями.
type Route struct {
	ID       string    `json:"id"`
	Sections []Section `json:"sections"`
}

// Section представляет одну секцию маршрута, включая действия, отправление, прибытие, сводку и транспортное средство.
type Section struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Actions   []Action  `json:"actions"`
	Departure Departure `json:"departure"`
	Arrival   Arrival   `json:"arrival"`
	Summary   Summary   `json:"summary"`
	Polyline  string    `json:"polyline"`
	Language  string    `json:"language"`
	Transport Transport `json:"transport"`
}

// Action представляет одно действие в секции.
type Action struct {
	Action      string  `json:"action"`
	Duration    int     `json:"duration"`
	Length      int     `json:"length"`
	Instruction string  `json:"instruction"`
	Offset      int     `json:"offset"`
	Direction   string  `json:"direction,omitempty"` // Optional field
	Severity    string  `json:"severity,omitempty"`  // Optional field
}

// Departure представляет данные об отправлении.
type Departure struct {
	Time  time.Time `json:"time"`
	Place Place     `json:"place"`
}

// Arrival представляет данные о прибытии.
type Arrival struct {
	Time  time.Time `json:"time"`
	Place Place     `json:"place"`
}

// Place представляет данные о месте, включая тип и координаты.
type Place struct {
	Type             string      `json:"type"`
	Location         Coordinates `json:"location"`
	OriginalLocation Coordinates `json:"originalLocation"`
}

// Coordinates представляет координаты широты и долготы.
type Coordinates struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// Summary представляет сводку по секции.
type Summary struct {
	Duration     int `json:"duration"`
	Length       float64 `json:"length"`
	BaseDuration int `json:"baseDuration"`
}

// Transport представляет данные о транспортном средстве.
type Transport struct {
	Mode string `json:"mode"`
}
// Структура для создания JWT-токена
type Claims struct {
	Username string `json:"username"`
	jwt.StandardClaims
}
