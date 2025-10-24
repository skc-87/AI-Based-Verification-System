import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import os

# ----------------------------
# ✅ ResNet Feature Extractor
# ----------------------------
class ResNetEmbedder(nn.Module):
    def __init__(self, device='cpu'):
        super(ResNetEmbedder, self).__init__()
        self.device = device

        # Load pre-trained ResNet18 model and remove the final classification layer
        resnet = models.resnet18(pretrained=True)
        self.feature_extractor = nn.Sequential(*list(resnet.children())[:-1])  # Remove final FC layer
        self.feature_extractor.to(self.device)
        self.feature_extractor.eval()

        # Preprocessing transform: Resize, Grayscale to RGB, Normalize
        self.preprocess = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.Grayscale(num_output_channels=3),  # Convert grayscale to RGB-like
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225])
        ])

    def get_embedding(self, image_path):
        """
        Takes in an image path and returns a flattened feature embedding.
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        image = Image.open(image_path).convert("RGB")
        image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)  # Shape: [1, 3, 224, 224]

        with torch.no_grad():
            features = self.feature_extractor(image_tensor)
            features = features.view(features.size(0), -1)  # Flatten
        return features.squeeze().cpu().numpy()  # NumPy array

    def get_embedding_from_array(self, img_array):
        """
        Takes in an image as a NumPy array and returns a flattened feature embedding.
        """
        # Convert the NumPy array to a PIL Image and preprocess it
        image = Image.fromarray(img_array).convert("RGB")
        image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)  # Shape: [1, 3, 224, 224]

        with torch.no_grad():
            features = self.feature_extractor(image_tensor)
            features = features.view(features.size(0), -1)  # Flatten
        return features.squeeze().cpu().numpy()  # NumPy array
