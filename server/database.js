module.exports = {
    SETUP_SQL: `CREATE TABLE IF NOT EXISTS [wohnungen](
        [id] INTEGER PRIMARY KEY AUTOINCREMENT, 
        [website] TEXT NOT NULL, 
        [websiteId] TEXT NOT NULL, 
        [url] TEXT, 
        [latitude] FLOAT, 
        [longitude] FLOAT, 
        [rooms] FLOAT, 
        [size] FLOAT, 
        [price] FLOAT, 
        [data] TEXT,
        [free_from] DATETIME,
        [active] BOOLEAN DEFAULT TRUE,
        [gone] BOOLEAN DEFAULT FALSE,
        [favorite] BOOLEAN DEFAULT FALSE,
        [comment] TEXT,
        [added] DATETIME DEFAULT CURRENT_TIMESTAMP,
        [removed] DATETIME DEFAULT NULL);`
}