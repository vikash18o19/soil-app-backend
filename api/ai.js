const express = require('express');
const router = express.Router();
// openai.api_key = "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";

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: "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",
});

router.post("/extract-parameters", async (req, res) => {
    try {
        // Get the list of parameters from the request body
        const params = req.body.parameters;
        console.log(params);
        if (params = "") {
            res.status(400).json({
                message: "No parameters passed."
            });
        }

        // Send the list of parameters to the GPT-3 API to extract relevant parameters
        const prompt = `List all the parameters which can be calculated using the following properties of soil: ${params}`;
        console.log(prompt);

        const openai = new OpenAIApi(configuration);
        const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            max_tokens: 1024,
            n: 1,
            stop: null,
            temperature: 0.7
        });
        console.log(completion.data.choices[0].text);
        const text = completion.data.choices[0].text;
        const arr = text.split("\n").map((s) => {
            const [num, value] = s.split(". ");
            const number = parseInt(num);
            return { number, value };
        }).filter(({ number }) => !isNaN(number));

        // Return the extracted parameters as a JSON response
        const data = { extractedParameters: arr };
        res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/property-query", async (req, res) => {
    try {
        // Get the list of parameters from the request body
        const property = req.body.property;
        console.log(property);

        // Send the list of parameters to the GPT-3 API to extract relevant parameters
        const prompt = `You are a civil engineer from IIT Bombay, Answer: how to calculate ${property} precisely as per the IS code?  Quote the IS code reference from the internet also.`;
        console.log(property);

        const openai = new OpenAIApi(configuration);
        const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            max_tokens: 1500,
            n: 1,
            stop: null,
            temperature: 0.5
        });
        console.log(completion.data.choices[0].text);
        const text = completion.data.choices[0].text;
        // const arr = text.split("\n").map((s) => {
        //     const [num, value] = s.split(". ");
        //     const number = parseInt(num);
        //     return { number, value };
        // }).filter(({ number }) => !isNaN(number));

        // Return the extracted parameters as a JSON response
        console.log(text);
        const data = { data: text };
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
    }
});

module.exports = router;