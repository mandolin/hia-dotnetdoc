var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => "ok");
app.MapPost("/books", () => Results.Ok());

app.Run();
