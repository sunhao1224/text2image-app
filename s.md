你是一个资深的前端开发工程师，使用 TypeScript 语言编写，下面是对应的要求，按照对应的要求进行代码编写

# 设计一个文生图的页面，包含调用大模型文生图接口
## 页面说明
1. 根据开源的网站的设计进行节点，主要包含文字输入，输出后点击生成按钮进行文生图的展示
2. 多轮对话需要携带历史回话信息给到大模型，进行对应新的图片的生成
3. 大模型设置样例，使用python编写的，如下:
base_url = 'https://api-inference.modelscope.cn/'
api_key = "ms-50b2039c-c2c3-46b1-8f77-d15ef430b95c" # ModelScope Token

common_headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}
response = requests.post(
    f"{base_url}v1/images/generations",
    headers={**common_headers, "X-ModelScope-Async-Mode": "true"},
    data=json.dumps({
        "model": "Qwen/Qwen-Image-2512", # ModelScope Model-Id, required
        # "loras": "<lora-repo-id>", # optional lora(s)
        # """
        # LoRA(s) Configuration:
        # - for Single LoRA:
        #   "loras": "<lora-repo-id>"
        # - for Multiple LoRAs:
        #   "loras": {"<lora-repo-id1>": 0.6, "<lora-repo-id2>": 0.4}
        # - Upto 6 LoRAs, all weight-coefficients must sum to 1.0
        # """
        "prompt": "A golden cat"
    }, ensure_ascii=False).encode('utf-8')
)

response.raise_for_status()
task_id = response.json()["task_id"]

while True:
    result = requests.get(
        f"{base_url}v1/tasks/{task_id}",
        headers={**common_headers, "X-ModelScope-Task-Type": "image_generation"},
    )
    result.raise_for_status()
    data = result.json()

    if data["task_status"] == "SUCCEED":
        image = Image.open(BytesIO(requests.get(data["output_images"][0]).content))
        image.save("result_image.jpg")
        break
    elif data["task_status"] == "FAILED":
        print("Image Generation Failed.")
        break


现在使用这个生成页面把



