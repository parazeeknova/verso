package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"verso/backy/database"
	"verso/backy/logger"
)

// --- Debug Handlers ---

// GetDebugTables handles GET /api/console/debug/tables.
func (h *Handlers) GetDebugTables(c *gin.Context) {
	pool := database.GetPool()
	if pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database unavailable"})
		return
	}

	rows, err := pool.Query(c.Request.Context(),
		`SELECT table_name FROM information_schema.tables 
		 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
		 ORDER BY table_name`)
	if err != nil {
		logger.Log.Error().Err(err).Msg("debug: list tables")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list tables"})
		return
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			logger.Log.Error().Err(err).Msg("debug: scan table name")
			continue
		}
		tables = append(tables, name)
	}

	if tables == nil {
		tables = []string{}
	}
	c.JSON(http.StatusOK, tables)
}

// GetDebugTableData handles GET /api/console/debug/tables/:tableName.
func (h *Handlers) GetDebugTableData(c *gin.Context) {
	pool := database.GetPool()
	if pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database unavailable"})
		return
	}

	tableName := c.Param("tableName")

	// Validate table name — only allow known tables
	allowed := map[string]bool{
		"pages": true, "page_history": true, "spaces": true,
		"workspaces": true, "users": true, "sessions": true,
		"refresh_tokens": true, "password_credentials": true,
	}
	if !allowed[tableName] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
		return
	}

	// Get columns with data types
	colRows, err := pool.Query(c.Request.Context(),
		`SELECT column_name, data_type FROM information_schema.columns 
		 WHERE table_schema = 'public' AND table_name = $1
		 ORDER BY ordinal_position`, tableName)
	if err != nil {
		logger.Log.Error().Str("table", tableName).Err(err).Msg("debug: list columns")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list columns"})
		return
	}
	defer colRows.Close()

	var columns []map[string]string
	for colRows.Next() {
		var name, dtype string
		if err := colRows.Scan(&name, &dtype); err != nil {
			continue
		}
		columns = append(columns, map[string]string{
			"name": name,
			"type": dtype,
		})
	}
	if colRows.Err() != nil {
		logger.Log.Error().Err(colRows.Err()).Msg("debug: column iter error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read columns"})
		return
	}

	if columns == nil {
		columns = []map[string]string{}
	}

	// Abbreviate type names for display
	typeAbbrev := map[string]string{
		"timestamp with time zone":    "timestamptz",
		"timestamp without time zone": "timestamp",
		"character varying":           "varchar",
		"double precision":            "float8",
		"bigint":                      "int8",
		"integer":                     "int4",
		"smallint":                    "int2",
		"boolean":                     "bool",
		"text":                        "text",
		"bytea":                       "bytea",
		"jsonb":                       "jsonb",
		"uuid":                        "uuid",
	}
	for i := range columns {
		if abbr, ok := typeAbbrev[columns[i]["type"]]; ok {
			columns[i]["type"] = abbr
		}
	}

	// Get data (limit 500 for safety)
	colNames := make([]string, len(columns))
	for i, col := range columns {
		colNames[i] = col["name"]
	}
	query := fmt.Sprintf(
		`SELECT %s FROM %s ORDER BY 1 DESC LIMIT 500`,
		safeColumns(colNames), safeIdent(tableName),
	)

	dataRows, err := pool.Query(c.Request.Context(), query)
	if err != nil {
		logger.Log.Error().Str("table", tableName).Err(err).Msg("debug: query table")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query table"})
		return
	}
	defer dataRows.Close()

	var data []map[string]any
	for dataRows.Next() {
		vals, scanErr := dataRows.Values()
		if scanErr != nil {
			logger.Log.Error().Err(scanErr).Msg("debug: scan row values")
			continue
		}
		row := make(map[string]any, len(colNames))
		for i, col := range colNames {
			if i < len(vals) {
				row[col] = formatDebugVal(vals[i])
			}
		}
		data = append(data, row)
	}
	if dataRows.Err() != nil {
		logger.Log.Error().Err(dataRows.Err()).Msg("debug: data iter error")
	}

	if data == nil {
		data = []map[string]any{}
	}

	c.JSON(http.StatusOK, gin.H{
		"columns": columns,
		"rows":    data,
	})
}

// DeleteDebugTableData handles DELETE /api/console/debug/tables/:tableName.
func (h *Handlers) DeleteDebugTableData(c *gin.Context) {
	pool := database.GetPool()
	if pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database unavailable"})
		return
	}

	tableName := c.Param("tableName")

	allowed := map[string]bool{
		"pages": true, "page_history": true, "spaces": true,
		"workspaces": true, "users": true, "sessions": true,
		"refresh_tokens": true, "password_credentials": true,
	}
	if !allowed[tableName] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
		return
	}

	query := fmt.Sprintf("DELETE FROM %s", safeIdent(tableName))
	tag, err := pool.Exec(c.Request.Context(), query)
	if err != nil {
		logger.Log.Error().Str("table", tableName).Err(err).Msg("debug: delete all rows")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete rows"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"deleted": tag.RowsAffected(),
		"table":   tableName,
	})
}

// DeleteDebugTableRows handles POST /api/console/debug/tables/:tableName/rows.
func (h *Handlers) DeleteDebugTableRows(c *gin.Context) {
	pool := database.GetPool()
	if pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database unavailable"})
		return
	}

	tableName := c.Param("tableName")

	allowed := map[string]bool{
		"pages": true, "page_history": true, "spaces": true,
		"workspaces": true, "users": true, "sessions": true,
		"refresh_tokens": true, "password_credentials": true,
	}
	if !allowed[tableName] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
		return
	}

	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids array is required"})
		return
	}

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no ids provided"})
		return
	}

	// Build DELETE ... WHERE id IN ($1, $2, ...)
	placeholders := ""
	args := make([]any, 0, len(req.IDs))
	for i, id := range req.IDs {
		if i > 0 {
			placeholders += ", "
		}
		placeholders += fmt.Sprintf("$%d", i+1)
		args = append(args, id)
	}

	query := fmt.Sprintf("DELETE FROM %s WHERE id IN (%s)", safeIdent(tableName), placeholders)
	tag, err := pool.Exec(c.Request.Context(), query, args...)
	if err != nil {
		logger.Log.Error().Str("table", tableName).Err(err).Msg("debug: delete rows")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete rows"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"deleted": tag.RowsAffected(),
		"table":   tableName,
	})
}

func safeIdent(name string) string {
	for _, c := range name {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_' {
			continue
		}
		return `"` + name + `"`
	}
	return name
}

func safeColumns(cols []string) string {
	out := ""
	for i, c := range cols {
		if i > 0 {
			out += ", "
		}
		out += safeIdent(c)
	}
	return out
}

func formatDebugVal(v any) any {
	switch val := v.(type) {
	case []byte:
		if len(val) == 16 {
			return fmt.Sprintf("%x-%x-%x-%x-%x", val[0:4], val[4:6], val[6:8], val[8:10], val[10:16])
		}
		return string(val)
	case [16]byte:
		return fmt.Sprintf("%x-%x-%x-%x-%x", val[0:4], val[4:6], val[6:8], val[8:10], val[10:16])
	case time.Time:
		return val.Format(time.RFC3339)
	default:
		return val
	}
}
