import yaml
import os

def load_yaml(file_path):
		"""
		从指定的YAML文件加载配置。
		如果data目录下存在同名配置文件，则优先读取data目录下的文件。

		参数:
				file_path (str): YAML文件的路径。

		返回:
				dict: 加载的配置字典。
		"""
		# 检查data目录下是否有同名文件
		data_dir = 'data'
		filename = os.path.basename(file_path)
		data_file_path = os.path.join(data_dir, filename)
		if os.path.exists(data_file_path):
				file_path = data_file_path
		
		with open(file_path, 'r', encoding='utf-8') as file:
				config = yaml.safe_load(file)
		return config
