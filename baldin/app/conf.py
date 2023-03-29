# app/config.py
from pathlib import Path

from pydantic import AnyUrl, BaseSettings
from selenium.webdriver.chrome.options import Options as ChromeOptions


class _Config:
    case_sensitive = False
    env_file = Path('.').parent.parent / ".env"
    env_file_encoding = "utf-8"


class _BaseSettings(BaseSettings):
    class Config(_Config):
        pass

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class Settings(_BaseSettings):
    environment : str
    database_url : AnyUrl
    database_test_url : AnyUrl
    log_level : str = "DEBUG"
    log_file_name : str = "app_log"
    public_asset_path : str = "public" 

class Chrome(_BaseSettings, env_prefix="CHROME_"):
    """
    Configuration for a Google Chrome web driver.
    
    See https://pypi.org/project/selenium/, `ChromeOptions` for more information.
    """
    driver_path: str
    incognito_option: bool = True
    headless_option: bool = True

    @property
    def options(self) -> ChromeOptions:
        options = ChromeOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--window-size=1420,1080')
        options.add_argument('--ignore-certificate-errors')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        if self.incognito_option:
            options.add_argument("--incognito")
        if self.headless_option:
            options.add_argument("--headless")
            options.add_argument("--dump-dom")
        return options


class OpenAI(_BaseSettings, env_prefix="OPENAI_"):
    """
    Configuration for OpenAI API.
    
    See https://openai.com/ for more information.
    """
    key: str = ""
    model: str = "gpt-3.5-turbo"


class Linkedin(_BaseSettings, env_prefix="LINKEDIN_"):
    """
    Configuration logging into LinkedIn.
    """
    username: str = ""
    password: str = ""

    search_endpoint: str = "https://www.linkedin.com/jobs/search/?currentJobId=3538510509&f_E=3%2C4&f_JT=F%2CC&f_TPR=r604800&f_WT=2&keywords=python%20aws"
    profile_endpoint: str = "https://www.linkedin.com/in/daniel-henderson-6a9485bb/"
    login_endpoint: str = "https://www.linkedin.com/login"


class Glassdoor(_BaseSettings, env_prefix="GLASSDOOR_"):
    """
    Configuration logging into Glassdoor.
    """
    username: str = ""
    password: str = ""

def get_settings(**kwargs) -> Settings:
    settings = Settings(**kwargs)
    return settings

def get_chrome_settings(**kwargs) -> Chrome:
    chrome = Chrome(**kwargs)
    return chrome


def get_openai_settings(**kwargs) -> OpenAI:
    openai = OpenAI(**kwargs)
    return openai


def get_linkedin_settings(**kwargs) -> Linkedin:
    linkedin = Linkedin(**kwargs)
    return linkedin


def get_glassdoor_settings(**kwargs) -> Glassdoor:
    glassdoor = Glassdoor(**kwargs)
    return glassdoor


settings = get_settings()

chrome = get_chrome_settings()

openai = get_openai_settings()

linkedin = get_linkedin_settings()

glassdoor = get_glassdoor_settings()

