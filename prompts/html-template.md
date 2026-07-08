# HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Meta', Arial, sans-serif;
            background: #FFFFFF;
            padding: 40px 60px;
            max-width: 1536px;
            margin: 0 auto;
            color: #483729; /* Neutral Dark */
        }
        h1, h2, h3, h4, h5, h6 {
            font-family: 'Adobe Caslon Pro', 'Times New Roman', serif;
            color: #483729;
            margin-bottom: 16px;
        }
        p {
            margin-bottom: 16px;
            line-height: 1.5;
        }
        .num { font-variant-numeric: tabular-nums; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; margin-bottom: 32px; }
        .grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 40px; margin-bottom: 32px; }
        .section-title { font-family: 'Adobe Caslon Pro', 'Times New Roman', serif; font-size: 32px; color: #483729; border-bottom: 2px solid #8C847A; padding-bottom: 8px; margin-bottom: 24px; }
        .card { background: #D5BA8C; padding: 24px; border-radius: 0; box-shadow: none; color: #483729; }
        .card-title { font-family: 'Adobe Caslon Pro', 'Times New Roman', serif; font-size: 24px; margin-bottom: 8px; color: #483729; }
        .big-number { font-size: 48px; font-weight: bold; line-height: 1; font-family: 'Meta', Arial, sans-serif; }
        .big-number-label { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #483729; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 16px; margin-bottom: 32px; }
        th { text-align: left; font-weight: bold; color: #483729; font-size: 14px; text-transform: uppercase; padding: 12px 8px; border-bottom: 2px solid #8C847A; }
        td { padding: 12px 8px; border-bottom: 1px solid #8C847A; }
        .bar-container { background: #EAE3D8; height: 16px; width: 100%; max-width: 150px; border-radius: 0; }
        .bar { background: #00793F; height: 100%; border-radius: 0; } /* WildCare Park primary */
        .highlight { background: #D5BA8C; padding: 0 4px; }
        .accent { color: #8A2433; font-weight: bold; } /* Red Rocks Dark */
    </style>
</head>
<body>
    <!-- KPI row, main content, detail sections -->
</body>
</html>
```
