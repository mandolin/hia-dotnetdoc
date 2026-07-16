using Microsoft.AspNetCore.Mvc;

namespace Portal.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    /// <summary>
    /// 中文：读取单本图书。
    /// English: Reads one book.
    /// </summary>
    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        return Ok();
    }

    /// <summary>
    /// 中文：创建图书。
    /// English: Creates a book.
    /// </summary>
    [HttpPost]
    public IActionResult Create()
    {
        return Ok();
    }
}
