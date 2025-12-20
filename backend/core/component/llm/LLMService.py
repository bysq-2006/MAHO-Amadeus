import importlib


class LLM:
    """
        LLM 服务类，对于不同的组件和BaseAmadeus提供的一个中间层。
        所有的组件必须实现一个类Client:
        class Client:
            def generate(self, prompt: str) -> str:
                ...
        generate方法用于生成文本响应。
    """
    def __init__(self, config: dict) -> None:
        # 1. 获取配置中的模块名
        select = config.get("select", "ollama_api")

        # 2. 动态导入模块
        try:
            module = importlib.import_module(
                f".{select}", package="core.component.llm")
        except ImportError as e:
            raise ImportError(f"无法加载模块 {select}: {e}")

        # 3. 获取对应的类
        client_class = getattr(module, "Client", None)
        if not client_class:
            raise ValueError(f"在模块 {select} 中找不到名为 'Client' 的类")

        # 4. 实例化
        # 获取对应模块的配置参数
        llm_config = config.get(select, {})

        self.provider = client_class(**llm_config)

    def __getattr__(self, name):
        """
        核心魔法：将 LLM 实例的方法调用转发给内部的 provider 实例。
        这就实现了“合并”的效果。
        例如调用 llm.generate() 时，实际上是调用 self.provider.generate()
        """
        if hasattr(self, 'provider') and self.provider:
            return getattr(self.provider, name)
        raise AttributeError(
            f"'{type(self).__name__}' 对象没有属性 '{name}'")
