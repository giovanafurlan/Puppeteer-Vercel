const app = require("express")();

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get("/api", async (req, res) => {
  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  try {
    let browser = await puppeteer.launch(options);

    let page = await browser.newPage();

    const parametro = req.query.parametro;

    if (!parametro) {
      return res.status(400).json({ error: "Parâmetro não fornecido" });
    }

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(parametro, { waitUntil: "networkidle2", timeout: 60000 }); // aumentando para 60 segundos (60000 milissegundos)

    // pega título
    let title = await page.title();
    // botão fecha modal
    await page.click("button.modal__dismiss");

    // pega conteúdo sobre
    // await page.waitForSelector(".core-section-container__content");
    // let elementSobre = await page.$(".core-section-container__content");
    // let sobre = await page.evaluate((el) => el.textContent, elementSobre);

    // pega conteúdo sobre
    const sobre = await page.evaluate(() => {
      const span = document.querySelector(".core-section-container__content");
      if (span) {
        return span.textContent.trim();
      }
      return null;
    });

    // pega conteúdo função
    const funcao = await page.evaluate(() => {
      const span = document.querySelector(".top-card-layout__headline");
      if (span) {
        return span.textContent.trim();
      }
      return null;
    });

    const localizacao = await page.evaluate(() => {
      const span = document.querySelector(
        "div.not-first-middot span:first-child"
      );
      if (span) {
        return span.textContent.trim();
      }
      return null;
    });

    const experiencias = await page.evaluate(() => {
      const experienceItems = document.querySelectorAll(
        'section[data-section="experience"] .experience-item'
      );
      const experiencesArray = [];

      experienceItems.forEach((item) => {
        const empresa = item
          .querySelector(".experience-item__subtitle")
          .textContent.trim();
        const duracao = item.querySelector(".date-range").textContent.trim();
        const localizacao = item
          .querySelectorAll(".experience-item__meta-item")[1]
          .textContent.trim();
        const descricao = item
          .querySelector(".show-more-less-text__text--less")
          .textContent.trim();

        experiencesArray.push({
          empresa,
          duracao,
          localizacao,
          descricao,
        });
      });

      return experiencesArray;
    });

    // Retornando a resposta como JSON
    res.json({ title, sobre, funcao, localizacao, experiencias });

  } catch (err) {
    console.error(err);
    return null;
  }
});

app.listen(process.env.PORT || 3005, () => {
  console.log("Server started");
});

module.exports = app;
