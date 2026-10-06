CREATE TABLE IF NOT EXISTS your-project-id.test.balance (
    kennzahl STRING,
    Jan FLOAT64,
    Feb FLOAT64,
    Mar FLOAT64,
    Apr FLOAT64,
    May FLOAT64,
    Jun FLOAT64,
    Jul FLOAT64,
    Aug FLOAT64,
    Sep FLOAT64,
    Oct FLOAT64,
    Nov FLOAT64,
    `Dec` FLOAT64
);
ALTER TABLE your-project-id.test.balance
ADD PRIMARY KEY(kennzahl) NOT ENFORCED;
