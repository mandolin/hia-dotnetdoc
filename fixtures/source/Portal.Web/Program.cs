var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => "ok")
    .WithName("HealthCheck")
    .WithTags("System")
    .AllowAnonymous();

app.MapPost("/books", () => Results.Ok())
    .WithName("CreateBook")
    .WithTags("Books")
    .RequireAuthorization("Books.Write")
    .Produces(StatusCodes.Status200OK);

app.Run();
