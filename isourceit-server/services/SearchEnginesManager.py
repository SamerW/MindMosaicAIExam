import asyncio
import os
import asyncio
import os
import requests
import aiohttp
from utils.Singleton import Singleton

bing_api_key = "6f8b606822514459a71e7d6af1fd0e22"
brave_api_key = "BSAcYpz3F9SpAt-uiQAUTJ_ksJe0-Tm"


__all__ = ['BingSearchClient',"BraveSearch"]

class BraveSearch(metaclass=Singleton):
    def __init__(self,api_key):
        """
        Initialize the BraveSearch instance with the API key.
        """
        self.api_key = api_key
        self.search_url = "https://api.search.brave.com/res/v1/web/search"
        self.headers = {
            "Accept": "application/json",
            "X-Subscription-Token": self.api_key
        }

    def search(self, query, count=10):
        """
        Perform a search on Brave and return the first 'count' URLs.
        """
        params = {
            "q": query,
            "count": count  # Limit the number of results
        }

        response = requests.get(self.search_url, headers=self.headers, params=params)
        
        if response.status_code == 200:
            results = response.json().get("web", {}).get("results", [])
            #return [result["url"] for result in results[:count]]  # Extract URLs
            return [{"id": idx + 1, "url": result["url"],"description":result.get("description", "No description available"),"title":result.get("title", "No description available")} for idx, result in enumerate(results[:count])]
        else:
            print("Error:", response.status_code, response.text)
            return None

class BingSearchClient(metaclass=Singleton):
    """
    A class for interacting with the Bing Search API.
    """
    
    def __init__(self,bing_api_key):
        """Initialize the Bing Search client with an API key."""
        self.api_key = bing_api_key
        if not self.api_key:
            raise ValueError("BING_SEARCH_API_KEY not found in environment")
        self.base_url = "https://api.bing.microsoft.com/v7.0/"
    
    def search(self, query: str, count: int = 10):
        """Perform a web search."""
        url = self.base_url + "search"
        headers = {"Ocp-Apim-Subscription-Key": self.api_key}
        params = {"q": query, "count": count}
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            # Check if there are webPages results
            if "webPages" in data:
                results = data["webPages"]["value"]
                # Loop through results and print title, snippet, and URL
                res = []
                for result in results:
                    title = result.get("name")
                    snippet = result.get("snippet")
                    url = result.get("url")
                    idx = result.get("id")
                    res.append({"id": idx , "url": url,"description":snippet,"title": title })
                return res
            else:
                print("No web page results found.")
        else:
            print("Error:", response.status_code, response.text)
            return None


    
    def search_images(self, query: str, count: int = 10):
        """Perform an image search."""
        url = self.base_url + "images/search"
        headers = {"Ocp-Apim-Subscription-Key": self.api_key}
        params = {"q": query, "count": count}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json().get("value", [])
    
    def search_videos(self, query: str, count: int = 10):
        """Perform a video search."""
        url = self.base_url + "videos/search"
        headers = {"Ocp-Apim-Subscription-Key": self.api_key}
        params = {"q": query, "count": count}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json().get("value", [])
    
    def search_news(self, query: str, count: int = 10):
        """Perform a news search."""
        url = self.base_url + "news/search"
        headers = {"Ocp-Apim-Subscription-Key": self.api_key}
        params = {"q": query, "count": count}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json().get("value", [])
    
    async def search_web_async(self, query: str, count: int = 10):
        """Perform an asynchronous web search."""
        url = self.base_url + "search"
        headers = {"Ocp-Apim-Subscription-Key": self.api_key}
        params = {"q": query, "count": count}
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                return await response.json()
    
    async def run_all_searches(self, query: str):
        """Run multiple searches with different query types."""
        web_results = self.search_web(query)
        image_results = self.search_images(query)
        video_results = self.search_videos(query)
        news_results = self.search_news(query)
        
        return {
            "web": web_results,
            "images": image_results,
            "videos": video_results,
            "news": news_results,
        }

if __name__ == "__main__":
    client = BingSearchClient()
    asyncio.run(client.run_all_searches())
