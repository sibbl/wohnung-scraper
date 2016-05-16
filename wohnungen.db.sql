CREATE TABLE [wohnungen](
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
    [active] BOOLEAN DEFAULT FALSE,
    [added] DATETIME DEFAULT CURRENT_TIMESTAMP);