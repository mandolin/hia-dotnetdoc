using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Portal.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Books.Read")]
[Produces("application/json")]
public class BooksController : ControllerBase
{
    /// <summary>
    /// 中文：读取单本图书。
    /// English: Reads one book.
    /// </summary>
    [HttpGet("{id}", Name = "GetBook")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Get(int id)
    {
        return Ok();
    }

    /// <summary>
    /// 中文：创建图书。
    /// English: Creates a book.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Editors")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public IActionResult Create()
    {
        return Ok();
    }
}
