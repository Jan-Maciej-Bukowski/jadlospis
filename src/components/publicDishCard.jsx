import * as React from "react";
import { styled } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Collapse from "@mui/material/Collapse";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { red } from "@mui/material/colors";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShareIcon from "@mui/icons-material/Share";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Button from "@mui/material/Button";
import PropTypes from "prop-types";

const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);

const ExpandMore = styled((props) => {
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme }) => ({
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
  variants: [
    {
      props: ({ expand }) => !expand,
      style: {
        transform: "rotate(0deg)",
      },
    },
    {
      props: ({ expand }) => !!expand,
      style: {
        transform: "rotate(180deg)",
      },
    },
  ],
}));

function PublicDishCard({
  dishData,
  onAddToDishes,
  onReport,
  liked,
  likesCount,
  onToggleLike,
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [authorAvatar, setAuthorAvatar] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!dishData?.author?.id) return;

    const fetchAuthorAvatar = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/user/${dishData.author.id}`);
        if (response.ok) {
          const data = await response.json();
          setAuthorAvatar(data.user?.avatar || null);
        }
      } catch (err) {
        console.warn("Failed to fetch author avatar ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorAvatar();
  }, [dishData?.author?.id]);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  if (!dishData) return null;

  const {
    name = "Brak nazwy",
    author = {},
    avatar = null,
    params = "",
    ingredients = [],
    tags = [],
    createdAt = new Date().toISOString(),
  } = dishData;

  const authorInitial =
    author.username?.[0]?.toUpperCase() ||
    author.username?.substring(0, 1).toUpperCase() ||
    "U";
  const createdDate = new Date(createdAt).toLocaleDateString("pl-PL");

  return (
    <Card className="public-dish-card">
      <CardHeader
        avatar={
          authorAvatar && !loading ? (
            <Avatar src={`${API}${authorAvatar}`} alt={author.username} />
          ) : (
            <Avatar sx={{ bgcolor: red[500] }} aria-label="author">
              {authorInitial}
            </Avatar>
          )
        }
        action={
          <IconButton
            aria-label="settings"
            onClick={() => onReport && onReport(dishData._id, name)}
          >
            <MoreVertIcon />
          </IconButton>
        }
        title={name}
        subheader={`${author.username || "Anonimowy"} • ${createdDate}`}
      />
      {avatar && (
        <CardMedia
          component="img"
          height="194"
          image={`${API}${avatar}`}
          alt={name}
        />
      )}
      <CardContent>
        {tags.length > 0 && (
          <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
            <strong>Tagi:</strong> {tags.join(", ")}
          </Typography>
        )}
      </CardContent>
      <CardActions disableSpacing>
        <IconButton
          aria-label="like"
          onClick={() => onToggleLike && onToggleLike(dishData)}
        >
          <FavoriteIcon sx={{ color: liked ? "red" : "rgba(0,0,0,0.54)" }} />
        </IconButton>
        <Typography variant="body2" sx={{ mr: 1 }}>
          {typeof likesCount === "number" ? likesCount : 0}
        </Typography>

        <IconButton aria-label="share">
          <ShareIcon />
        </IconButton>
        <ExpandMore
          expand={expanded}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <ExpandMoreIcon />
        </ExpandMore>
      </CardActions>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          {ingredients.length > 0 && (
            <>
              <Typography sx={{ marginBottom: 2, fontWeight: 600 }}>
                Składniki:
              </Typography>
              {ingredients.map((ing, idx) => (
                <Typography key={idx} sx={{ marginBottom: 1 }}>
                  • {ing.name} - {ing.amount} {ing.unit}
                </Typography>
              ))}
              <Typography sx={{ marginBottom: 2, fontWeight: 600 }}>
                Przepis:
              </Typography>
              {params && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {params}
                </Typography>
              )}
            </>
          )}
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2, mr: 1 }}
            onClick={() => onAddToDishes && onAddToDishes(dishData)}
          >
            Dodaj do potraw
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            sx={{ mt: 2 }}
            onClick={() => onReport && onReport(dishData._id)}
          >
            Zgłoś
          </Button>
        </CardContent>
      </Collapse>
    </Card>
  );
}

PublicDishCard.propTypes = {
  dishData: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
    author: PropTypes.shape({
      username: PropTypes.string,
      id: PropTypes.string,
    }),
    avatar: PropTypes.string,
    params: PropTypes.string,
    ingredients: PropTypes.array,
    tags: PropTypes.array,
    createdAt: PropTypes.string,
  }),
  onAddToDishes: PropTypes.func,
  onReport: PropTypes.func,
  liked: PropTypes.bool,
  likesCount: PropTypes.number,
  onToggleLike: PropTypes.func,
};

export default PublicDishCard;
